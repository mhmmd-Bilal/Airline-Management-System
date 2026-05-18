import mongoose from "mongoose";

const refundSchema = new mongoose.Schema(
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
    reason: {
      type: String,
    },
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "approved", "rejected", "processed"],
    },
    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Refunds = mongoose.model("refunds", refundSchema);
export default Refunds;