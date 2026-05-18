// controllers/notificationController.js
import Notifications from "../models/notificationModel.js";
import expressAsyncHandler from "express-async-handler";
import { emitNotification } from "../services/socketService.js";

/* -------------------------------------------------------------------------- */
/*                           SHARED HELPERS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Creates a notification in DB and emits it via Socket.io.
 * Call this from any controller (booking, support, flight, etc.)
 *
 * @param {object} payload
 *   recipient   – ObjectId | null  (null = broadcast to roleTarget)
 *   roleTarget  – "all" | "passenger" | "crew" | "admin"
 *   title       – string
 *   message     – string
 *   type        – "booking"|"flight"|"payment"|"refund"|"support"|"loyalty"|"system"
 *   relatedId   – ObjectId (optional)
 *   relatedModel– string (optional)
 *   sentBy      – ObjectId (optional)
 */
export async function createNotification(payload) {
  const notification = await Notifications.create({
    recipient:    payload.recipient    ?? null,
    roleTarget:   payload.roleTarget   ?? "all",
    title:        payload.title,
    message:      payload.message,
    type:         payload.type         ?? "system",
    relatedId:    payload.relatedId    ?? null,
    relatedModel: payload.relatedModel ?? null,
    sentBy:       payload.sentBy       ?? null,
  });

  /* Emit via socket */
  emitNotification(notification);

  return notification;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/notifications                                                     */
/*  Returns notifications for the logged-in user:                             */
/*    – direct (recipient = user._id)                                         */
/*    – role-broadcast (roleTarget = user.role OR "all", recipient = null)    */
/* -------------------------------------------------------------------------- */
export const getMyNotifications = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const query = {
    $or: [
      { recipient: req.user._id },
      { recipient: null, roleTarget: req.user.role },
      { recipient: null, roleTarget: "all" },
    ],
  };

  if (unreadOnly === "true") query.isRead = false;

  const total         = await Notifications.countDocuments(query);
  const unreadCount   = await Notifications.countDocuments({ ...query, isRead: false });
  const notifications = await Notifications.find(query)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    total,
    unreadCount,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       notifications,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/notifications/unread-count                                       */
/*  Lightweight endpoint for the bell badge — just returns the count.         */
/* -------------------------------------------------------------------------- */
export const getUnreadCount = expressAsyncHandler(async (req, res) => {
  const query = {
    isRead: false,
    $or: [
      { recipient: req.user._id },
      { recipient: null, roleTarget: req.user.role },
      { recipient: null, roleTarget: "all" },
    ],
  };

  const count = await Notifications.countDocuments(query);

  res.status(200).json({ success: true, count });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/notifications/:id/read                                         */
/* -------------------------------------------------------------------------- */
export const markAsRead = expressAsyncHandler(async (req, res) => {
  const notification = await Notifications.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({ success: true, data: notification });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/notifications/read-all                                         */
/*  Marks all of the user's notifications as read.                            */
/* -------------------------------------------------------------------------- */
export const markAllAsRead = expressAsyncHandler(async (req, res) => {
  await Notifications.updateMany(
    {
      isRead: false,
      $or: [
        { recipient: req.user._id },
        { recipient: null, roleTarget: req.user.role },
        { recipient: null, roleTarget: "all" },
      ],
    },
    { $set: { isRead: true } },
  );

  res.status(200).json({ success: true, message: "All notifications marked as read" });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/notifications/:id                                             */
/* -------------------------------------------------------------------------- */
export const deleteNotification = expressAsyncHandler(async (req, res) => {
  const notification = await Notifications.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  /* Only owner or admin can delete */
  const isOwner = String(notification.recipient) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorised" });
  }

  await notification.deleteOne();

  res.status(200).json({ success: true, message: "Notification deleted" });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/notifications/clear-all                                       */
/*  Clears all of the user's read notifications.                              */
/* -------------------------------------------------------------------------- */
export const clearAllRead = expressAsyncHandler(async (req, res) => {
  await Notifications.deleteMany({
    isRead: true,
    $or: [
      { recipient: req.user._id },
      { recipient: null, roleTarget: req.user.role },
      { recipient: null, roleTarget: "all" },
    ],
  });

  res.status(200).json({ success: true, message: "Read notifications cleared" });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/notifications/broadcast  (admin only)                           */
/*  Admin sends a notification to all users of a role (or all roles).         */
/* -------------------------------------------------------------------------- */
export const broadcastNotification = expressAsyncHandler(async (req, res) => {
  const { title, message, type, roleTarget } = req.body;

  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, message: "Title and message are required" });
  }

  const notification = await createNotification({
    recipient:  null,
    roleTarget: roleTarget || "all",
    title:      title.trim(),
    message:    message.trim(),
    type:       type || "system",
    sentBy:     req.user._id,
  });

  res.status(201).json({ success: true, data: notification });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/notifications/all  (admin only)                                  */
/*  Admin sees all notifications in the system.                               */
/* -------------------------------------------------------------------------- */
export const getAllNotifications = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, roleTarget } = req.query;

  const query = {};
  if (type       && type       !== "all") query.type       = type;
  if (roleTarget && roleTarget !== "all") query.roleTarget = roleTarget;

  const total         = await Notifications.countDocuments(query);
  const notifications = await Notifications.find(query)
    .populate("recipient", "name email role")
    .populate("sentBy",    "name email role")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       notifications,
  });
});