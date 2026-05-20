// routes/refundRoutes.js
import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  requestRefund,
  getMyRefunds,
  getRefundStats,
  getAllRefunds,
  processRefund,
} from "../controllers/refundController.js";

const router = express.Router();

/* ── Passenger ── */
router.post("/", protect, requestRefund); // request a refund
router.get("/my", protect, getMyRefunds); // my refund history

/* ── Admin ── */
router.get("/stats", protect, adminOnly, getRefundStats);
router.get("/", protect, adminOnly, getAllRefunds);
router.patch("/:id", protect, adminOnly, processRefund);

export default router;
