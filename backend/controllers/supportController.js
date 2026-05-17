// controllers/supportController.js
import SupportTickets from "../models/supportTicketModel.js";
import Bookings       from "../models/bookingModel.js";
import expressAsyncHandler from "express-async-handler";

/* -------------------------------------------------------------------------- */
/*                              SHARED POPULATE                               */
/* -------------------------------------------------------------------------- */

const TICKET_POPULATE = [
  {
    path:   "raisedBy",
    select: "name email phone role",
  },
  {
    path:   "assignedTo",
    select: "name email role",
  },
  {
    path:   "resolvedBy",
    select: "name email role",
  },
  {
    path:   "bookingId",
    select: "bookingReference seats seatClass totalAmount status",
  },
  {
    path:   "flightId",
    select: "flightNumber source destination departureTime arrivalTime status",
  },
  {
    path:   "messages.sender",
    select: "name role",
  },
];

/* -------------------------------------------------------------------------- */
/*  POST /api/support                                                          */
/*  Passenger raises a new ticket.                                            */
/* -------------------------------------------------------------------------- */
export const createTicket = expressAsyncHandler(async (req, res) => {
  const { subject, description, category, priority, bookingId, flightId } = req.body;

  if (!subject?.trim() || !description?.trim()) {
    return res.status(400).json({
      success: false,
      message: "Subject and description are required",
    });
  }

  /* Validate bookingId belongs to this user if provided */
  if (bookingId) {
    const booking = await Bookings.findOne({
      _id:         bookingId,
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
    raisedBy:    req.user._id,
    subject:     subject.trim(),
    description: description.trim(),
    category:    category    || "general",
    priority:    priority    || "medium",
    bookingId:   bookingId   || null,
    flightId:    flightId    || null,
    /* First message = initial description posted as system message */
    messages: [
      {
        sender:      req.user._id,
        senderRole:  req.user.role || "passenger",
        message:     description.trim(),
        readByAdmin: false,
        readByUser:  true,
      },
    ],
    unreadByAdmin: 1,
    unreadByUser:  0,
  });

  const populated = await SupportTickets.findById(ticket._id).populate(TICKET_POPULATE);

  res.status(201).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support/my                                                        */
/*  Passenger views their own tickets.                                        */
/* -------------------------------------------------------------------------- */
export const getMyTickets = expressAsyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { raisedBy: req.user._id };
  if (status && status !== "all") query.status = status;

  const total   = await SupportTickets.countDocuments(query);
  const tickets = await SupportTickets.find(query)
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       tickets,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support/:id                                                       */
/*  Get single ticket — owner or admin.                                       */
/* -------------------------------------------------------------------------- */
export const getTicketById = expressAsyncHandler(async (req, res) => {
  const ticket = await SupportTickets.findById(req.params.id).populate(TICKET_POPULATE);

  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }

  const isOwner = String(ticket.raisedBy._id) === String(req.user._id);
  const isAdmin = req.user.role === "admin";
  const isCrew  = req.user.role === "crew";

  if (!isOwner && !isAdmin && !isCrew) {
    return res.status(403).json({ success: false, message: "Not authorised" });
  }

  /* Mark messages as read by the viewer */
  if (isAdmin) {
    await SupportTickets.findByIdAndUpdate(ticket._id, {
      $set:     { "messages.$[].readByAdmin": true },
      unreadByAdmin: 0,
    });
  }

  if (isOwner) {
    await SupportTickets.findByIdAndUpdate(ticket._id, {
      $set:     { "messages.$[].readByUser": true },
      unreadByUser: 0,
    });
  }

  res.status(200).json({ success: true, data: ticket });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/support/:id/reply                                               */
/*  User or admin posts a reply to the thread.                                */
/* -------------------------------------------------------------------------- */
export const replyToTicket = expressAsyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ success: false, message: "Message is required" });
  }

  const ticket = await SupportTickets.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }

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
    sender:      req.user._id,
    senderRole:  req.user.role || "user",
    message:     message.trim(),
    readByAdmin: isAdmin,
    readByUser:  isOwner,
  };

  ticket.messages.push(newMessage);

  /* Update status to in-progress when admin first replies */
  if (isAdmin && ticket.status === "open") {
    ticket.status = "in-progress";
  }

  /* Update unread counters */
  if (isAdmin) {
    ticket.unreadByUser += 1;
  } else {
    ticket.unreadByAdmin += 1;
  }

  await ticket.save();

  const populated = await SupportTickets.findById(ticket._id).populate(TICKET_POPULATE);

  res.status(200).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/support/:id/status  (admin)                                    */
/*  Admin updates ticket status and optionally adds a resolution note.        */
/* -------------------------------------------------------------------------- */
export const updateTicketStatus = expressAsyncHandler(async (req, res) => {
  const { status, resolutionNote, priority, assignedTo } = req.body;

  const ticket = await SupportTickets.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }

  const validStatuses = ["open", "in-progress", "resolved", "closed"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (status) ticket.status = status;
  if (priority) ticket.priority = priority;
  if (assignedTo) ticket.assignedTo = assignedTo;

  if (status === "resolved") {
    ticket.resolvedBy     = req.user._id;
    ticket.resolvedAt     = new Date();
    ticket.resolutionNote = resolutionNote?.trim() || "";

    /* Post a system message about resolution */
    ticket.messages.push({
      sender:      req.user._id,
      senderRole:  "admin",
      message:     resolutionNote?.trim()
        ? `✓ Resolved: ${resolutionNote.trim()}`
        : "✓ This ticket has been marked as resolved.",
      readByAdmin: true,
      readByUser:  false,
    });
    ticket.unreadByUser += 1;
  }

  if (status === "closed") {
    ticket.closedAt = new Date();
  }

  await ticket.save();

  const populated = await SupportTickets.findById(ticket._id).populate(TICKET_POPULATE);

  res.status(200).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support  (admin)                                                  */
/*  All tickets with filters — admin dashboard.                               */
/* -------------------------------------------------------------------------- */
export const getAllTickets = expressAsyncHandler(async (req, res) => {
  const {
    status, priority, category,
    search, page = 1, limit = 15,
  } = req.query;

  const query = {};
  if (status   && status   !== "all") query.status   = status;
  if (priority && priority !== "all") query.priority = priority;
  if (category && category !== "all") query.category = category;

  if (search) {
    query.$or = [
      { ticketNumber: { $regex: search, $options: "i" } },
      { subject:      { $regex: search, $options: "i" } },
    ];
  }

  const total   = await SupportTickets.countDocuments(query);
  const tickets = await SupportTickets.find(query)
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  /* Stats for dashboard cards */
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
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    stats:      { open, inProgress, resolved, closed, urgent },
    data:       tickets,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/support/flight/:flightId  (crew + admin)                         */
/*  Tickets linked to a specific flight — for crew dashboard.                 */
/* -------------------------------------------------------------------------- */
export const getTicketsByFlight = expressAsyncHandler(async (req, res) => {
  const { flightId } = req.params;
  const { status, page = 1, limit = 10 } = req.query;

  const query = { flightId };
  if (status && status !== "all") query.status = status;

  const total   = await SupportTickets.countDocuments(query);
  const tickets = await SupportTickets.find(query)
    .populate(TICKET_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       tickets,
  });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/support/:id  (admin)                                           */
/*  Hard delete a ticket — admin only.                                        */
/* -------------------------------------------------------------------------- */
export const deleteTicket = expressAsyncHandler(async (req, res) => {
  const ticket = await SupportTickets.findById(req.params.id);

  if (!ticket) {
    return res.status(404).json({ success: false, message: "Ticket not found" });
  }

  await ticket.deleteOne();

  res.status(200).json({
    success: true,
    message: `Ticket ${ticket.ticketNumber} deleted`,
  });
});