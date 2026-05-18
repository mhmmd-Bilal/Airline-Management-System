// controllers/supportController.js
import SupportTickets from "../models/supportTicketModel.js";
import Bookings from "../models/bookingModel.js";
import Crews from "../models/crewModel.js";
import Flights from "../models/flightsModel.js";
import { createNotification } from "./notificationController.js";
import expressAsyncHandler from "express-async-handler";
import {
  emitNewMessage,
  emitTicketUpdated,
  emitNewTicket,
} from "../services/socketService.js";

/* -------------------------------------------------------------------------- */
/*                              SHARED POPULATE                               */
/* -------------------------------------------------------------------------- */

const TICKET_POPULATE = [
  { path: "raisedBy", select: "name email phone role" },
  { path: "assignedTo", select: "name email role" },
  { path: "resolvedBy", select: "name email role" },
  {
    path: "bookingId",
    select: "bookingReference seats seatClass totalAmount status",
  },
  {
    path: "flightId",
    select: "flightNumber source destination departureTime arrivalTime status",
  },
  { path: "messages.sender", select: "name role" },
];

/* -------------------------------------------------------------------------- */
/*  POST /api/support                                                          */
/*  Passenger raises a new ticket.                                            */
/* -------------------------------------------------------------------------- */
export const createTicket = expressAsyncHandler(async (req, res) => {
  const { subject, description, category, priority, bookingId, flightId } =
    req.body;

  if (!subject?.trim() || !description?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Subject and description are required",
    });
  }

  if (bookingId) {
    const booking = await Bookings.findOne({
      _id: bookingId,
      passengerId: req.user._id,
    });
    if (!booking) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking — it does not belong to you",
      });
    }
  }

  const ticket = await SupportTickets.create({
    raisedBy: req.user._id,
    subject: subject.trim(),
    description: description.trim(),
    category: category || "general",
    priority: priority || "medium",
    bookingId: bookingId || null,
    flightId: flightId || null,
    messages: [
      {
        sender: req.user._id,
        senderRole: "passenger",
        message: description.trim(),
        readByAdmin: false,
        readByUser: true,
      },
    ],
    unreadByAdmin: 1,
    unreadByUser: 0,
  });

  const populated = await SupportTickets.findById(ticket._id).populate(
    TICKET_POPULATE,
  );

  /* Notify admin dashboard in real-time */
  emitNewTicket(populated);

  res.status(201).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support/my                                                        */
/* -------------------------------------------------------------------------- */
export const getMyTickets = expressAsyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const query = { raisedBy: req.user._id };
  if (status && status !== "all") query.status = status;

  const total = await SupportTickets.countDocuments(query);
  const tickets = await SupportTickets.find(query)
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: tickets,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support/:id                                                       */
/* -------------------------------------------------------------------------- */
export const getTicketById = expressAsyncHandler(async (req, res) => {
  const ticket = await SupportTickets.findById(req.params.id).populate(
    TICKET_POPULATE,
  );
  if (!ticket)
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });

  const isOwner = String(ticket.raisedBy._id) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  const isCrew = req.user.role === "crew";

  if (!isOwner && !isAdmin && !isCrew) {
    return res.status(403).json({ success: false, message: "Not authorised" });
  }

  if (isAdmin && ticket.unreadByAdmin > 0) {
    await SupportTickets.findByIdAndUpdate(ticket._id, {
      $set: { "messages.$[].readByAdmin": true },
      unreadByAdmin: 0,
    });
    ticket.unreadByAdmin = 0;
  }
  if (isOwner && ticket.unreadByUser > 0) {
    await SupportTickets.findByIdAndUpdate(ticket._id, {
      $set: { "messages.$[].readByUser": true },
      unreadByUser: 0,
    });
    ticket.unreadByUser = 0;
  }

  res.status(200).json({ success: true, data: ticket });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/support/:id/reply                                               */
/* -------------------------------------------------------------------------- */
export const replyToTicket = expressAsyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) {
    return res
      .status(400)
      .json({ success: false, message: "Message is required" });
  }

  const ticket = await SupportTickets.findById(req.params.id);
  if (!ticket)
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });

  const isOwner = String(ticket.raisedBy) === String(req.user._id);
  const isAdmin = req.user.role === "admin";

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ success: false, message: "Not authorised" });
  }
  if (["resolved", "closed"].includes(ticket.status) && !isAdmin) {
    return res.status(400).json({
      success: false,
      message: "Cannot reply to a resolved or closed ticket",
    });
  }

  const newMessage = {
    sender: req.user._id,
    senderRole: isAdmin ? "admin" : "passenger",
    message: message.trim(),
    readByAdmin: isAdmin,
    readByUser: isOwner,
  };

  ticket.messages.push(newMessage);
  if (isAdmin && ticket.status === "open") ticket.status = "in-progress";
  if (isAdmin) ticket.unreadByUser += 1;
  else ticket.unreadByAdmin += 1;

  await ticket.save();

  if (isAdmin) {
    await createNotification({
      recipient: ticket.raisedBy,
      title: "Support reply",
      message: `Your ticket ${ticket.ticketNumber} has a new reply from support.`,
      type: "support",
      relatedId: ticket._id,
      relatedModel: "supporttickets",
    });
  }

  const populated = await SupportTickets.findById(ticket._id).populate(
    TICKET_POPULATE,
  );

  /* ── Real-time: emit to ticket room ── */
  const lastMsg = populated.messages[populated.messages.length - 1];
  emitNewMessage(String(ticket._id), lastMsg, populated);

  res.status(200).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/support/:id/status  (admin)                                    */
/* -------------------------------------------------------------------------- */
export const updateTicketStatus = expressAsyncHandler(async (req, res) => {
  const { status, resolutionNote, priority, assignedTo } = req.body;

  const ticket = await SupportTickets.findById(req.params.id);
  if (!ticket)
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });

  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (assignedTo) ticket.assignedTo = assignedTo;

  if (status === "resolved") {
    ticket.resolvedBy = req.user._id;
    ticket.resolvedAt = new Date();
    ticket.resolutionNote = resolutionNote?.trim() || "";
    ticket.messages.push({
      sender: req.user._id,
      senderRole: "admin",
      message: resolutionNote?.trim()
        ? `✓ Resolved: ${resolutionNote.trim()}`
        : "✓ This ticket has been marked as resolved.",
      readByAdmin: true,
      readByUser: false,
    });
    ticket.unreadByUser += 1;

    await createNotification({
      recipient: ticket.raisedBy,
      title: "Ticket resolved",
      message: `Your support ticket ${ticket.ticketNumber} has been resolved.${resolutionNote ? " " + resolutionNote : ""}`,
      type: "support",
      relatedId: ticket._id,
      relatedModel: "supporttickets",
    });
  }

  if (status === "closed") ticket.closedAt = new Date();

  await ticket.save();

  const populated = await SupportTickets.findById(ticket._id).populate(
    TICKET_POPULATE,
  );

  /* ── Real-time: notify ticket room + admin feed ── */
  emitTicketUpdated(String(ticket._id), populated);

  res.status(200).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support  (admin)                                                  */
/* -------------------------------------------------------------------------- */
export const getAllTickets = expressAsyncHandler(async (req, res) => {
  const {
    status,
    priority,
    category,
    search,
    page = 1,
    limit = 15,
  } = req.query;

  const query = {};
  if (status && status !== "all") query.status = status;
  if (priority && priority !== "all") query.priority = priority;
  if (category && category !== "all") query.category = category;
  if (search) {
    query.$or = [
      { ticketNumber: { $regex: search, $options: "i" } },
      { subject: { $regex: search, $options: "i" } },
    ];
  }

  const total = await SupportTickets.countDocuments(query);
  const tickets = await SupportTickets.find(query)
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const [open, inProgress, resolved, closed, urgent] = await Promise.all([
    SupportTickets.countDocuments({ status: "open" }),
    SupportTickets.countDocuments({ status: "in-progress" }),
    SupportTickets.countDocuments({ status: "resolved" }),
    SupportTickets.countDocuments({ status: "closed" }),
    SupportTickets.countDocuments({ priority: "urgent" }),
  ]);

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    stats: { open, inProgress, resolved, closed, urgent },
    data: tickets,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support/flight/:flightId  (crew + admin)                         */
/*                                                                             */
/*  Crew: validated against crewIds on the flight document.                  */
/*  Prevents any crew member reading tickets for flights they're not on.      */
/* -------------------------------------------------------------------------- */
export const getTicketsByFlight = expressAsyncHandler(async (req, res) => {
  const { flightId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  if (req.user.role === "crew") {
    /* Step 1 — find the crew document for this user */
    const crewDoc = await Crews.findOne({ userId: req.user._id }).select("_id");
    if (!crewDoc) {
      return res
        .status(403)
        .json({ success: false, message: "Crew profile not found" });
    }

    /* Step 2 — confirm this crew member is in the flight's crewIds array */
    const flight = await Flights.findOne({
      _id: flightId,
      crewIds: crewDoc._id,
    }).select("_id");

    if (!flight) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this flight",
      });
    }
  }

  const query = { flightId };
  if (status && status !== "all") query.status = status;

  const total = await SupportTickets.countDocuments(query);
  const tickets = await SupportTickets.find(query)
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: tickets,
  });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/support/:id  (admin)                                          */
/* -------------------------------------------------------------------------- */
export const deleteTicket = expressAsyncHandler(async (req, res) => {
  const ticket = await SupportTickets.findById(req.params.id);
  if (!ticket)
    return res
      .status(404)
      .json({ success: false, message: "Ticket not found" });

  await ticket.deleteOne();
  res
    .status(200)
    .json({ success: true, message: `Ticket ${ticket.ticketNumber} deleted` });
});
