// models/bookingModel.js
import mongoose from "mongoose";
import crypto from "crypto";

const passengerSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  age:   { type: Number, required: true },
  gender:{ type: String, enum: ["male", "female", "other"], required: true },
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type:    String,
      unique:  true,
      default: () => "AIR-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
    },
    passengerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "users",
      required: true,
    },
    flightId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "flights",
      required: true,
    },
    passengers: {
      type:     [passengerSchema],
      required: true,
    },
    passengerCount: {
      type:    Number,
      required: true,
      min:     1,
    },
    seats: {
      type:     [String],   // ["12A", "12B"]
      required: true,
    },
    seatClass: {
      type:    String,
      default: "economy",
      enum:    ["economy", "business", "first"],
    },
    status: {
      type:    String,
      default: "confirmed",
      enum:    ["confirmed", "cancelled", "completed", "pending"],
    },
    totalAmount: {
      type:     Number,
      required: true,
    },
    paymentStatus: {
      type:    String,
      default: "pending",
      enum:    ["pending", "paid", "refunded", "failed"],
    },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    cancelledAt:       { type: Date },
  },
  { timestamps: true }
);

// auto-complete booking when flight completes
bookingSchema.index({ flightId: 1, status: 1 });
bookingSchema.index({ passengerId: 1, createdAt: -1 });

const Bookings = mongoose.model("bookings", bookingSchema);
export default Bookings;