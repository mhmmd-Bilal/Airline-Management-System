import express from "express";
import {
  getAllFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  getFlightStats,
  assignCrew,
  getFlightsByCrewId,
} from "../controllers/flightController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/getFlightsByCrewId",protect,getFlightsByCrewId)

router.get("/stats", protect, adminOnly, getFlightStats);
router.get("/", protect, getAllFlights);
router.get("/:id", protect, adminOnly, getFlightById);
router.post("/", protect, adminOnly, createFlight);
router.put("/:id", protect, adminOnly, updateFlight);
router.patch("/:id/crew", protect, adminOnly, assignCrew);
router.delete("/:id", protect, adminOnly, deleteFlight);

export default router;
