// routes/loyaltyRoutes.js
import express from "express";
import {
  getMyLoyalty,
  earnPoints,
  redeemPoints,
  getLoyaltyByPassenger,
  getAllLoyalty,
  addBonusPoints,
} from "../controllers/loyaltyController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

// passenger
router.get("/me", protect, getMyLoyalty);
router.post("/earn", protect, earnPoints);
router.post("/redeem", protect, redeemPoints);

// admin
router.get("/", protect, adminOnly, getAllLoyalty);
router.get("/:passengerId", protect, adminOnly, getLoyaltyByPassenger);
router.post("/:passengerId/bonus", protect, adminOnly, addBonusPoints);

export default router;
