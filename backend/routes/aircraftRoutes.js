// routes/aircraftRoutes.js
import express from "express";
import {
  getAllAircraft,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
  getAircraftStats,
} from "../controllers/aircraftController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, adminOnly, getAircraftStats);
router.get("/", protect, adminOnly, getAllAircraft);
router.get("/:id", protect, adminOnly, getAircraftById);
router.post("/", protect, adminOnly, createAircraft);
router.put("/:id", protect, adminOnly, updateAircraft);
router.delete("/:id", protect, adminOnly, deleteAircraft);

export default router;