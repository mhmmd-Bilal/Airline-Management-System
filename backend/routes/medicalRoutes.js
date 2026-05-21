// routes/medicalRoutes.js
import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
  createMedicalRecord,
  getMyMedicalRecords,
  getAllMedicalRecords,
  updateMedicalRecordStatus,
} from "../controllers/medicalController.js";

const router = express.Router();

router.post("/", protect, createMedicalRecord);
router.get("/my", protect, getMyMedicalRecords);
router.get("/", protect, adminOnly, getAllMedicalRecords);
router.patch("/:id/status", protect, adminOnly, updateMedicalRecordStatus);

export default router;
