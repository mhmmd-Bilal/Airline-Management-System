import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    raisedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bookings",
    },
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flights",
    },
    subject: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      default: "medium",
      enum: ["low", "medium", "high"],
    },
    status: {
      type: String,
      default: "open",
      enum: ["open", "in-progress", "resolved", "closed"],
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

const SupportTickets = mongoose.model("supporttickets", supportTicketSchema);
export default SupportTickets;
