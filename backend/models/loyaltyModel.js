// models/loyaltyModel.js
import mongoose from "mongoose";

// ── Tier thresholds ────────────────────────────────────
// silver: 0–4999 pts  | gold: 5000–14999 pts  | platinum: 15000+ pts
export const TIER_THRESHOLDS = {
  silver:   0,
  gold:     5000,
  platinum: 15000,
};

// Points earned per ₹1000 spent
export const POINTS_PER_THOUSAND = 10;

// ₹1 value per point when redeeming
export const POINT_REDEMPTION_VALUE = 0.5; // 1 point = ₹0.50

const loyaltySchema = new mongoose.Schema(
  {
    passengerId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "users",
      required: true,
      unique:   true,
    },
    points: {
      type:    Number,
      default: 0,
      min:     0,
    },
    tier: {
      type:    String,
      default: "silver",
      enum:    ["silver", "gold", "platinum"],
    },
    totalEarned: {        // lifetime earned (never decremented)
      type:    Number,
      default: 0,
    },
    totalRedeemed: {      // lifetime redeemed
      type:    Number,
      default: 0,
    },
    history: [
      {
        type: {
          type: String,
          enum: ["earned", "redeemed", "bonus", "expired"],
        },
        points: {
          type: Number,
        },
        description: {   // human-readable reason
          type: String,
        },
        bookingId: {
          type: mongoose.Schema.Types.ObjectId,
          ref:  "bookings",
        },
        date: {
          type:    Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// ── Auto-derive tier from totalEarned (lifetime) ──────
// Tier is based on lifetime points earned, not current balance
loyaltySchema.methods.recalculateTier = function () {
  const earned = this.totalEarned;
  if (earned >= TIER_THRESHOLDS.platinum) {
    this.tier = "platinum";
  } else if (earned >= TIER_THRESHOLDS.gold) {
    this.tier = "gold";
  } else {
    this.tier = "silver";
  }
};

// ── Add points (earn) ──────────────────────────────────
loyaltySchema.methods.addPoints = function (pts, description, bookingId = null) {
  this.points        += pts;
  this.totalEarned   += pts;
  this.history.unshift({
    type:        "earned",
    points:      pts,
    description: description || `Earned ${pts} points`,
    bookingId,
    date:        new Date(),
  });
  this.recalculateTier();
};

// ── Redeem points ──────────────────────────────────────
loyaltySchema.methods.redeemPoints = function (pts, description, bookingId = null) {
  if (pts > this.points) {
    throw new Error("Insufficient points balance");
  }
  this.points         -= pts;
  this.totalRedeemed  += pts;
  this.history.unshift({
    type:        "redeemed",
    points:      pts,
    description: description || `Redeemed ${pts} points`,
    bookingId,
    date:        new Date(),
  });
};

const Loyalty = mongoose.model("loyalty", loyaltySchema);
export default Loyalty;