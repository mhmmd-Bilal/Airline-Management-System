import express from "express";
import {
  getAllFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  getFlightStats,
  getFlightsByCrewId,
  searchFlights,
  getBookedFlights,
  trackMyFlight,
} from "../controllers/flightController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// routes/flightRoutes.js
router.get("/search", searchFlights);
router.get("/crew/:crewId", protect, getFlightsByCrewId);
router.get("/track-my-flight/:flightId", protect, trackMyFlight);
router.get("/my-booked-flights", protect, getBookedFlights);
router.get("/stats", protect, getFlightStats);
router.get("/", getAllFlights);
router.get("/:id", getFlightById);
router.post("/", protect, adminOnly, createFlight);
router.put("/:id", protect, updateFlight);
router.delete("/:id", protect, adminOnly, deleteFlight);

export default router;
