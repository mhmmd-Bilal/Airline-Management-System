// models/supportTicketModel.js
import mongoose from "mongoose";

/* -------------------------------------------------------------------------- */
/*                            Message Sub-Schema                              */
/* -------------------------------------------------------------------------- */
/*
 * Each ticket has a thread of messages — both passenger and admin can post.
 * senderRole distinguishes who wrote what for UI rendering.
 */
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "users",
      required: true,
    },
    senderRole: {
      type:    String,
      enum:    ["passenger", "admin", "crew"],
      required: true,
    },
    message: {
      type:     String,
      required: true,
      trim:     true,
    },
    readByAdmin: {
      type:    Boolean,
      default: false,
    },
    readByUser: {
      type:    Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*                          Support Ticket Schema                             */
/* -------------------------------------------------------------------------- */

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type:    String,
      unique:  true,
      default: () =>
        "TKT-" +
        Date.now().toString(36).toUpperCase() +
        Math.random().toString(36).slice(2, 5).toUpperCase(),
    },

    raisedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "users",
      required: true,
    },

    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "bookings",
    },

    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "flights",
    },

    category: {
      type:    String,
      enum:    ["booking", "flight", "payment", "baggage", "refund", "general", "other"],
      default: "general",
    },

    subject: {
      type:     String,
      required: true,
      trim:     true,
    },

    description: {
      type:     String,
      required: true,
      trim:     true,
    },

    priority: {
      type:    String,
      default: "medium",
      enum:    ["low", "medium", "high", "urgent"],
    },

    status: {
      type:    String,
      default: "open",
      enum:    ["open", "in-progress", "resolved", "closed"],
    },

    /* Admin who is handling this ticket */
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "users",
    },

    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "users",
    },

    resolvedAt: {
      type: Date,
    },

    closedAt: {
      type: Date,
    },

    /* Resolution note written by admin when closing/resolving */
    resolutionNote: {
      type:    String,
      trim:    true,
      default: "",
    },

    /* Message thread — passenger ↔ admin replies */
    messages: {
      type:    [messageSchema],
      default: [],
    },

    /* Quick flag — unread messages for admin dashboard badge */
    unreadByAdmin: {
      type:    Number,
      default: 0,
    },

    /* Quick flag — unread messages for user notification */
    unreadByUser: {
      type:    Number,
      default: 0,
    },
  },
  { timestamps: true },
);

/* -------------------------------------------------------------------------- */
/*                                 Indexes                                    */
/* -------------------------------------------------------------------------- */

supportTicketSchema.index({ raisedBy: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: 1 });
supportTicketSchema.index({ flightId: 1 });
supportTicketSchema.index({ bookingId: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ ticketNumber: 1 });

const SupportTickets = mongoose.model("supporttickets", supportTicketSchema);
export default SupportTickets;