// routes/bookingRoutes.js
import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  getMyBookings,
  getBookingById,
  createOrder,
  verifyPayment,
  // cancelBooking,
  getBookingStats,
  getFlightSeats,
  downloadBoardingPass,
  downloadTicket,
  downloadInvoice,
  getBookingsByFlightId,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/my", protect, getMyBookings);
router.get("/stats", protect, getBookingStats); // admin
router.get("/:id", protect, getBookingById);
router.get("/flight/:flightId/seats", protect, getFlightSeats);
router.get("/flight/:flightId", protect, getBookingsByFlightId);
router.get("/:id/download/boarding-pass", protect, downloadBoardingPass);
router.get("/:id/download/ticket", protect, downloadTicket);
router.get("/:id/download/invoice", protect, downloadInvoice);
router.post("/create-order", protect, createOrder);
router.post("/verify-payment", protect, verifyPayment);
// router.post("/:id/cancel", protect, cancelBooking);

export default router;
