import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "bookings",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ["card", "upi", "netbanking", "wallet"],
      required: true,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "success", "failed", "refunded"],
    },
    transactionId: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Payments = mongoose.model("payments", paymentSchema);
export default Payments;