// routes/crewRoutes.js
import express from "express";
import {
  getAllCrew,
  getMyCrewProfile,
  getCrewByUserId,
  createCrew,
  updateCrew,
  updateCrewStatus,
  deleteCrew,
  getCrewStats,
} from "../controllers/crewController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

/*
 * ROUTE ORDER MATTERS:
 * /stats and /me must come BEFORE /:id routes,
 * otherwise Express matches "stats" and "me" as :id params.
 */
router.get("/stats", protect, adminOnly, getCrewStats);
router.get("/me", protect, getMyCrewProfile); // ← NEW: crew gets own profile
router.get("/by-user/:userId", protect, getCrewByUserId);
router.get("/", protect, adminOnly, getAllCrew);
router.post("/", protect, adminOnly, createCrew);
router.put("/:id", protect, adminOnly, updateCrew);
router.patch("/:id/status", protect, adminOnly, updateCrewStatus);
router.delete("/:id", protect, adminOnly, deleteCrew);

export default router;
