// controllers/loyaltyController.js
import Loyalty, {
  TIER_THRESHOLDS,
  POINTS_PER_THOUSAND,
  POINT_REDEMPTION_VALUE,
} from "../models/loyaltyModel.js";
import expressAsyncHandler from "express-async-handler";

// ── @desc    Get or create loyalty profile for logged-in user
// ── @route   GET /api/loyalty/me
// ── @access  Passenger
export const getMyLoyalty = expressAsyncHandler(async (req, res) => {
  let loyalty = await Loyalty.findOne({ passengerId: req.user._id }).populate(
    "history.bookingId",
    "flightId totalAmount",
  );

  // auto-create on first access
  if (!loyalty) {
    loyalty = await Loyalty.create({ passengerId: req.user._id });
  }

  const nextTier = getNextTierInfo(loyalty.tier, loyalty.totalEarned);

  res.status(200).json({
    success: true,
    data: {
      _id: loyalty._id,
      points: loyalty.points,
      tier: loyalty.tier,
      totalEarned: loyalty.totalEarned,
      totalRedeemed: loyalty.totalRedeemed,
      history: loyalty.history,
      nextTier,
      redemptionValue: Math.floor(loyalty.points * POINT_REDEMPTION_VALUE),
    },
  });
});

// ── @desc    Earn points (called internally after booking)
// ── @route   POST /api/loyalty/earn
// ── @access  Passenger
export const earnPoints = expressAsyncHandler(async (req, res) => {
  const { amount, bookingId } = req.body;

  if (!amount || amount <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Valid amount is required" });
  }

  let loyalty = await Loyalty.findOne({ passengerId: req.user._id });
  if (!loyalty) {
    loyalty = new Loyalty({ passengerId: req.user._id });
  }

  const pts = calculatePoints(amount, loyalty.tier);
  loyalty.addPoints(
    pts,
    `Booking reward — ₹${amount.toLocaleString()} Added`,
    bookingId,
  );
  await loyalty.save();

  res.status(200).json({
    success: true,
    message: `${pts} points earned`,
    data: {
      pointsEarned: pts,
      newBalance: loyalty.points,
      tier: loyalty.tier,
    },
  });
});

// ── @desc    Redeem points
// ── @route   POST /api/loyalty/redeem
// ── @access  Passenger
export const redeemPoints = expressAsyncHandler(async (req, res) => {
  const { points, bookingId } = req.body;

  if (!points || points <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Valid points value is required" });
  }

  const loyalty = await Loyalty.findOne({ passengerId: req.user._id });
  if (!loyalty) {
    return res
      .status(404)
      .json({ success: false, message: "Loyalty profile not found" });
  }

  if (points > loyalty.points) {
    return res.status(400).json({
      success: false,
      message: `Insufficient points. You have ${loyalty.points} points but tried to redeem ${points}`,
    });
  }

  const rupeeValue = Math.floor(points * POINT_REDEMPTION_VALUE);

  loyalty.redeemPoints(
    points,
    `Redeemed ${points} pts → ₹${rupeeValue} discount`,
    bookingId,
  );
  await loyalty.save();

  res.status(200).json({
    success: true,
    message: `${points} points redeemed for ₹${rupeeValue} discount`,
    data: {
      pointsRedeemed: points,
      rupeeValue,
      newBalance: loyalty.points,
    },
  });
});

// ── @desc    Get loyalty by passengerId (admin)
// ── @route   GET /api/loyalty/:passengerId
// ── @access  Admin
export const getLoyaltyByPassenger = expressAsyncHandler(async (req, res) => {
  const loyalty = await Loyalty.findOne({ passengerId: req.params.passengerId })
    .populate("passengerId", "name email")
    .populate("history.bookingId", "flightId totalAmount");

  if (!loyalty) {
    return res
      .status(404)
      .json({ success: false, message: "Loyalty profile not found" });
  }

  res.status(200).json({ success: true, data: loyalty });
});

// ── @desc    Get all loyalty profiles (admin)
// ── @route   GET /api/loyalty
// ── @access  Admin
export const getAllLoyalty = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 20, tier } = req.query;

  const query = {};
  if (tier && tier !== "all") query.tier = tier;

  const total = await Loyalty.countDocuments(query);
  const records = await Loyalty.find(query)
    .populate("passengerId", "name email phone")
    .sort({ points: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: records,
  });
});

// ── @desc    Manually add bonus points (admin)
// ── @route   POST /api/loyalty/:passengerId/bonus
// ── @access  Admin
export const addBonusPoints = expressAsyncHandler(async (req, res) => {
  const { points, description } = req.body;

  if (!points || points <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Valid points value is required" });
  }

  let loyalty = await Loyalty.findOne({ passengerId: req.params.passengerId });
  if (!loyalty) {
    loyalty = new Loyalty({ passengerId: req.params.passengerId });
  }

  loyalty.points += points;
  loyalty.totalEarned += points;
  loyalty.history.unshift({
    type: "bonus",
    points,
    description: description || `Admin bonus: ${points} points`,
    date: new Date(),
  });
  loyalty.recalculateTier();
  await loyalty.save();

  res.status(200).json({
    success: true,
    message: `${points} bonus points added`,
    data: { newBalance: loyalty.points, tier: loyalty.tier },
  });
});

// ── Helpers ────────────────────────────────────────────
function calculatePoints(amount, tier) {
  const base = Math.floor((amount / 1000) * POINTS_PER_THOUSAND);
  const multiplier = tier === "platinum" ? 3 : tier === "gold" ? 2 : 1;
  return base * multiplier;
}

function getNextTierInfo(currentTier, totalEarned) {
  if (currentTier === "platinum") {
    return { nextTier: null, pointsNeeded: 0, progress: 100 };
  }
  const nextTier = currentTier === "silver" ? "gold" : "platinum";
  const current = TIER_THRESHOLDS[currentTier];
  const next = TIER_THRESHOLDS[nextTier];
  const pointsNeeded = Math.max(0, next - totalEarned);
  const progress = Math.min(
    100,
    Math.round(((totalEarned - current) / (next - current)) * 100),
  );
  return { nextTier, pointsNeeded, progress };
}

// Export helpers for use in booking controller
export { calculatePoints };
