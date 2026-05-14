// routes/attendanceRoutes.js
import express from "express";
import {
  getTodayAttendance,
  getMyAttendanceByMonth,
  getMyAttendance,
  punchIn,
  punchOut,
  getAllAttendance,
} from "../controllers/attendanceController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// crew routes
router.get("/my/month", protect, getMyAttendanceByMonth);
router.get("/today", protect, getTodayAttendance);
router.get("/my", protect, getMyAttendance);
router.post("/punch-in", protect, punchIn);
router.patch("/punch-out", protect, punchOut);

// admin route
router.get("/", protect, adminOnly, getAllAttendance);

export default router;
