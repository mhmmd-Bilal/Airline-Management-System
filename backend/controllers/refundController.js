// controllers/refundController.js
import Refunds from "../models/refundModel.js";
import Bookings from "../models/bookingModel.js";
import Flights from "../models/flightsModel.js";
import Loyalty, { POINTS_PER_THOUSAND } from "../models/loyaltyModel.js";
import Razorpay from "razorpay";
import expressAsyncHandler from "express-async-handler";
import { createNotification } from "./notificationController.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const REFUND_POPULATE = [
  { path: "passengerId", select: "name email phone" },
  {
    path: "bookingId",
    select:
      "bookingReference seats seatClass totalAmount status cancelledAt razorpayPaymentId flightId",
    populate: {
      path: "flightId",
      select: "flightNumber source destination departureTime",
    },
  },
];

function pointsForAmount(amount) {
  return Math.floor((amount / 1000) * POINTS_PER_THOUSAND);
}

/* -------------------------------------------------------------------------- */
/*  POST /api/refunds                                                          */
/*  Passenger requests a refund after cancellation                            */
/* -------------------------------------------------------------------------- */
export const requestRefund = expressAsyncHandler(async (req, res) => {
  const { bookingId, reason } = req.body;

  if (!bookingId) {
    return res
      .status(400)
      .json({ success: false, message: "bookingId is required" });
  }

  const booking = await Bookings.findById(bookingId);
  if (!booking) {
    return res
      .status(404)
      .json({ success: false, message: "Booking not found" });
  }

  // only the booking owner can request a refund
  if (String(booking.passengerId) !== String(req.user._id)) {
    return res.status(403).json({ success: false, message: "Not authorised" });
  }

  //   if (booking.status !== "cancelled") {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Only cancelled bookings are eligible for a refund",
  //     });
  //   }

  if (booking.paymentStatus !== "paid") {
    return res.status(400).json({
      success: false,
      message: "No payment found for this booking",
    });
  }

  // prevent duplicate refund requests
  const existing = await Refunds.findOne({ bookingId });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: `A refund request already exists for this booking (${existing.status})`,
    });
  }

  const flight = booking.flightId;

  const hoursUntilDeparture =
    (new Date(flight.departureTime) - Date.now()) / 3600000;

  if (hoursUntilDeparture < 2) {
    return res.status(400).json({
      success: false,
      message: "Cannot cancel within 2 hours of departure",
    });
  }

  booking.status = "cancelled";
  booking.cancelledAt = new Date();
  booking.paymentStatus = "refunded";

  await booking.save();

  //     // Restore seats
  await Flights.findByIdAndUpdate(flight._id, {
    $inc: { availableSeats: booking.passengerCount },
  });

  const refund = await Refunds.create({
    passengerId: req.user._id,
    bookingId: booking._id,
    amount: booking.totalAmount,
    reason:
      reason?.trim() || booking.cancellationReason || "Cancelled by passenger",
    status: "pending",
  });

  try {
    const loyalty = await Loyalty.findOne({ passengerId: req.user._id });

    if (loyalty) {
      /* Find the exact earned entry for this booking */
      const earnedEntry = loyalty.history.find(
        (h) =>
          h.type === "earned" &&
          h.bookingId &&
          String(h.bookingId) === String(bookingId),
      );

      const ptsToDeduct = earnedEntry
        ? earnedEntry.points
        : pointsForAmount(booking.totalAmount);

      if (ptsToDeduct > 0) {
        /* Clamp so balance never goes below 0 */
        const actualDeduct = Math.min(ptsToDeduct, loyalty.points);

        loyalty.points -= actualDeduct;

        /* Record deduction in history */
        loyalty.history.unshift({
          type: "redeemed",
          points: actualDeduct,
          description: `Points reversed — booking ${booking.bookingReference} cancelled`,
          bookingId: booking._id,
          date: new Date(),
        });

        /*
         * Note: totalRedeemed is NOT incremented here because this is
         * a reversal/cancellation, not a voluntary redemption.
         * Tier is NOT recalculated downward — tier is based on
         * totalEarned (lifetime) and never decreases per model design.
         */

        await loyalty.save();
      }
    }
  } catch (loyaltyErr) {
    /*
     * Loyalty deduction failure must never block the refund response.
     * Log the error and continue — the refund is already created.
     */
    console.error(
      `[refund] loyalty deduction failed for booking ${booking.bookingReference}:`,
      loyaltyErr.message,
    );
  }

  const populated = await Refunds.findById(refund._id).populate(
    REFUND_POPULATE,
  );

  // notify admin
  await createNotification({
    roleTarget: "admin",
    title: "New refund request",
    message: `${req.user.name} requested a refund of ${fmtMoney(booking.totalAmount)} for booking ${booking.bookingReference}.`,
    type: "refund",
    relatedId: refund._id,
    relatedModel: "refunds",
    sentBy: req.user._id,
  });

  res.status(201).json({ success: true, data: populated });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/refunds/my                                                        */
/*  Passenger — their own refund requests                                     */
/* -------------------------------------------------------------------------- */
export const getMyRefunds = expressAsyncHandler(async (req, res) => {
  const refunds = await Refunds.find({ passengerId: req.user._id })
    .populate(REFUND_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: refunds });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/refunds/stats  (admin)                                            */
/* -------------------------------------------------------------------------- */
export const getRefundStats = expressAsyncHandler(async (req, res) => {
  const [total, pending, approved, processed, rejected, amountAgg] =
    await Promise.all([
      Refunds.countDocuments(),
      Refunds.countDocuments({ status: "pending" }),
      Refunds.countDocuments({ status: "approved" }),
      Refunds.countDocuments({ status: "processed" }),
      Refunds.countDocuments({ status: "rejected" }),
      Refunds.aggregate([
        {
          $group: {
            _id: "$status",
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

  const amountByStatus = amountAgg.reduce((acc, row) => {
    acc[row._id] = row.totalAmount;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: {
      total,
      pending,
      approved,
      processed,
      rejected,
      totalAmount: Object.values(amountByStatus).reduce((a, b) => a + b, 0),
      processedAmount: amountByStatus.processed ?? 0,
      rejectedAmount: amountByStatus.rejected ?? 0,
    },
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/refunds  (admin)                                                  */
/*  Paginated list with optional status filter                                 */
/* -------------------------------------------------------------------------- */
export const getAllRefunds = expressAsyncHandler(async (req, res) => {
  const { status = "all", page = 1, limit = 15 } = req.query;

  const query = {};
  if (status !== "all") query.status = status;

  const total = await Refunds.countDocuments(query);
  const refunds = await Refunds.find(query)
    .populate(REFUND_POPULATE)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .lean();

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: refunds,
  });
});

/* -------------------------------------------------------------------------- */
/*  PATCH /api/refunds/:id  (admin)                                            */
/*  Approve or reject a refund request                                         */
/* -------------------------------------------------------------------------- */
// In your refundController.js — replace processRefund with this

export const processRefund = expressAsyncHandler(async (req, res) => {
  const { action, note } = req.body;

  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "action must be 'approve' or 'reject'",
    });
  }

  const refund = await Refunds.findById(req.params.id).populate(
    REFUND_POPULATE,
  );
  if (!refund) {
    return res
      .status(404)
      .json({ success: false, message: "Refund not found" });
  }

  if (["processed", "rejected"].includes(refund.status)) {
    return res.status(400).json({
      success: false,
      message: `Refund already ${refund.status}`,
    });
  }

  const booking = await Bookings.findById(
    refund.bookingId._id ?? refund.bookingId,
  );

  /* ====================================================================== */
  /*  APPROVE                                                                */
  /* ====================================================================== */
  if (action === "approve") {
    /* ── Razorpay refund attempt ── */
    if (booking?.razorpayPaymentId) {
      try {
        await razorpay.payments.refund(booking.razorpayPaymentId, {
          amount: refund.amount * 100, // paise
          notes: {
            refundId: String(refund._id),
            bookingRef: booking?.bookingReference,
            note: note || "Approved by admin",
          },
        });
      } catch (err) {
        console.error("[refund] Razorpay error:", err.message);
        // Log but don't block — admin may process manually
      }
    }

    /* ── Update refund ── */
    refund.status = "processed";
    refund.processedAt = new Date();
    refund.reason = note?.trim()
      ? `${refund.reason} — Admin note: ${note.trim()}`
      : refund.reason;
    await refund.save();

    /* ── Update booking ── */
    if (booking) {
      booking.paymentStatus = "refunded";
      await booking.save();
    }

    /*
     * Loyalty points: on APPROVE the deduction made during requestRefund
     * stands — nothing to do here. Points were already removed when the
     * passenger cancelled the booking.
     */

    /* ── Notify passenger ── */
    await createNotification({
      recipient: refund.passengerId._id ?? refund.passengerId,
      title: "Refund approved ✓",
      message: `Your refund of ${fmtMoney(refund.amount)} for booking ${booking?.bookingReference ?? ""} has been approved and will be credited within 5–7 business days.`,
      type: "refund",
      relatedId: refund._id,
      relatedModel: "refunds",
      sentBy: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Refund approved and processed",
      data: refund,
    });
  }

  /* ====================================================================== */
  /*  REJECT                                                                 */
  /*                                                                         */
  /*  When rejected:                                                         */
  /*   1. Refund status → rejected                                           */
  /*   2. Booking status → confirmed (un-cancel it)                         */
  /*   3. Available seats restored on the flight                            */
  /*   4. Loyalty points restored (add back what was deducted)              */
  /* ====================================================================== */

  /* ── 1. Update refund ── */
  refund.status = "rejected";
  refund.processedAt = new Date();
  refund.reason = note?.trim()
    ? `${refund.reason} — Rejected: ${note.trim()}`
    : refund.reason;
  await refund.save();

  /* ── 2. Restore booking to confirmed ── */
  if (booking) {
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.cancelledAt = null;
    await booking.save();
  }

  /* ── 3. Restore available seats on the flight ── */
  if (booking?.flightId) {
    await Flights.findByIdAndUpdate(booking.flightId, {
      $inc: { availableSeats: -(booking.passengerCount ?? 1) },
      // decrement because we incremented during cancel — restoring the booking
    });
  }

  /* ── 4. Restore loyalty points ── */
  /*
   * Find the "redeemed" history entry that was added during requestRefund
   * (description contains the bookingReference). Add those points back.
   *
   * We use addPoints() so the restoration is recorded in history and
   * totalEarned / tier recalculation happens correctly.
   *
   * If no deduction entry is found, fall back to recalculating from amount.
   */
  try {
    const passengerId = refund.passengerId._id ?? refund.passengerId;
    const loyalty = await Loyalty.findOne({ passengerId });

    if (loyalty && booking) {
      /* Find the reversal entry added during requestRefund */
      const reversalEntry = loyalty.history.find(
        (h) =>
          h.type === "redeemed" &&
          h.bookingId &&
          String(h.bookingId) === String(booking._id) &&
          h.description?.includes("cancelled"),
      );

      const ptsToRestore = reversalEntry
        ? reversalEntry.points
        : pointsForAmount(booking.totalAmount);

      if (ptsToRestore > 0) {
        loyalty.addPoints(
          ptsToRestore,
          `Points restored — refund rejected for booking ${booking.bookingReference}`,
          booking._id,
        );
        await loyalty.save();
      }
    }
  } catch (loyaltyErr) {
    /*
     * Never block the response if loyalty restoration fails.
     * Log for manual correction.
     */
    console.error(
      `[refund] loyalty restoration failed for booking ${booking?.bookingReference}:`,
      loyaltyErr.message,
    );
  }

  /* ── 5. Notify passenger ── */
  await createNotification({
    recipient: refund.passengerId._id ?? refund.passengerId,
    title: "Refund request rejected",
    message: `Your refund request of ${fmtMoney(refund.amount)} for booking ${booking?.bookingReference ?? ""} was not approved. Your booking has been reinstated.${note ? ` Reason: ${note}` : ""}`,
    type: "refund",
    relatedId: refund._id,
    relatedModel: "refunds",
    sentBy: req.user._id,
  });

  return res.status(200).json({
    success: true,
    message: "Refund rejected and booking reinstated",
    data: refund,
  });
});
