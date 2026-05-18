import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead,
  broadcastNotification,
  getAllNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

/* ── All authenticated users ── */
router.get("/", protect, getMyNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.patch("/read-all", protect, markAllAsRead);
router.delete("/clear-all", protect, clearAllRead);
router.patch("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

/* ── Admin only ── */
router.post("/broadcast", protect, adminOnly, broadcastNotification);
router.get("/all", protect, adminOnly, getAllNotifications);

export default router;
