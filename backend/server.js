import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http"; // ✅ add this

import connectDb from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes.js";
import aircraftRoutes from "./routes/aircraftRoutes.js";
import flightRoutes from "./routes/flightRoutes.js";
import crewRoutes from "./routes/crewRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import loyaltyRoutes from "./routes/loyaltyRoutes.js";
import supportRoutes from "./routes/supportRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import revenueRoutes from "./routes/revenueRoutes.js";
import refundRoutes from "./routes/refundRoutes.js";
import medicalRoutes from "./routes/medicalRoutes.js";

import "./cron/attendanceCron.js";
import { startFlightStatusCron } from "./cron/flightStatusCron.js";
import { initSocket } from "./services/socketService.js";

const app = express();

connectDb();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);

startFlightStatusCron();

const httpServer = createServer(app);

initSocket(httpServer);

app.use("/api/users", userRoutes);
app.use("/api/aircraft", aircraftRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/crew", crewRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/revenue", revenueRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/medical", medicalRoutes);

httpServer.listen(4000, () => console.log("Server Started"));
