// routes/supportRoutes.js
import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createTicket,
  getMyTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
  getAllTickets,
  getTicketsByFlight,
  deleteTicket,
} from "../controllers/supportController.js";

const router = express.Router();

/* ── Passenger routes ── */
router.post("/", protect, createTicket);
router.get("/my", protect, getMyTickets);

/* ── Shared (owner + admin + crew) ── */
router.get("/:id", protect, getTicketById);
router.post("/:id/reply", protect, replyToTicket);

/* ── Admin only ── */
router.get("/", protect, adminOnly, getAllTickets);
router.patch("/:id/status", protect, adminOnly, updateTicketStatus);
router.delete("/:id", protect, adminOnly, deleteTicket);

/* ── Crew + admin ── */
router.get("/flight/:flightId", protect, getTicketsByFlight);

export default router;
