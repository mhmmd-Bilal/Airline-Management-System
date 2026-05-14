import express from "express";
import connectDb from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes.js";
import aircraftRoutes from "./routes/aircraftRoutes.js";
import flightRoutes from "./routes/flightRoutes.js";
import crewRoutes from "./routes/crewRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";


import dotenv from "dotenv";
import { startFlightStatusCron } from "./cron/flightStatusCron.js";

dotenv.config();

const app = express();

connectDb();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

startFlightStatusCron()

app.use("/api/user", userRoutes);
app.use("/api/aircraft", aircraftRoutes);
app.use("/api/flights", flightRoutes);
app.use("/api/crew", crewRoutes);
app.use("/api/attendance", attendanceRoutes);


app.listen(4000, () => console.log("Server Started"));
