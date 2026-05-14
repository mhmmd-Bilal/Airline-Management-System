// models/Booking.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "flights",
      required: true,
    },
    seatNumber: {
      type: String,
      required: true,
    },
    seatClass: {
      type: String,
      default: "economy",
      enum: ["economy", "business", "first"],
    },
    status: {
      type: String,
      default: "confirmed",
      enum: ["confirmed", "cancelled", "completed", "pending"],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      default: "pending",
      enum: ["pending", "paid", "refunded", "failed"],
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "payments",
    },
    boardingPass: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Bookings = mongoose.model("bookings", bookingSchema);
export default Bookings;