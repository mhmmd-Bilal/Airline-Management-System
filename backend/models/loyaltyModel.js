import mongoose from "mongoose";

const loyaltySchema = new mongoose.Schema(
  {
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    tier: {
      type: String,
      default: "silver",
      enum: ["silver", "gold", "platinum"],
    },
    history: [
      {
        type: {
          type: String,
          enum: ["earned", "redeemed"],
        },
        points: {
          type: Number,
        },
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "bookings",
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Loyalty = mongoose.model("loyalty", loyaltySchema);
export default Loyalty;