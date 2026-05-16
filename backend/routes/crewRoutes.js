import express from "express";
import {
  getAllCrew,
  getCrewByUserId,
  createCrew,
  updateCrew,
  updateCrewStatus,
  deleteCrew,
  getCrewStats,
} from "../controllers/crewController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, adminOnly, getCrewStats);
router.get("/", protect, adminOnly, getAllCrew);
router.get("/by-user/:userId", protect, getCrewByUserId);
router.post("/", protect, adminOnly, createCrew);
router.put("/:id", protect, adminOnly, updateCrew);
router.patch("/:id/status", protect, adminOnly, updateCrewStatus);
router.delete("/:id", protect, adminOnly, deleteCrew);

export default router;
