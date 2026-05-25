// routes/userRoutes.js
import express from "express";
import {
  registerUser,
  loginUser,
  getUserStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMe,
  logoutUser,
} from "../controllers/userController.js";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";

const router = express.Router();

/* ── Public ── */
router.post("/register", registerUser);
router.post("/login", loginUser);

/* ── Authenticated ── */
router.get("/me", protect, getMe);
router.put("/me", protect, updateUser);
router.post("/logout",protect,logoutUser)

/* ── Admin only ── */
router.get("/stats", protect, adminOnly, getUserStats);
router.get("/", protect, adminOnly, getAllUsers);
router.get("/:id", protect, adminOnly, getUserById);
router.delete("/:id", protect, adminOnly, deleteUser);

export default router;
