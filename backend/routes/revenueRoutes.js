// routes/revenueRoutes.js
import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  getRevenueOverview,
  getRevenueBreakdown,
  getRevenueStats,
} from "../controllers/revenueController.js";

const router = express.Router();

router.get("/overview", protect, adminOnly, getRevenueOverview);
router.get("/breakdown", protect, adminOnly, getRevenueBreakdown);
router.get("/stats", protect, adminOnly, getRevenueStats);

export default router;
