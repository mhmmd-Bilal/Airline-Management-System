// controllers/bookingController.js
import Bookings from "../models/bookingModel.js";
import Flights from "../models/flightsModel.js";
import Loyalty from "../models/loyaltyModel.js";
import Notifications from "../models/notificationModel.js";
import Refunds from "../models/refundModel.js";
import { generateBookingPDFs } from "../services/pdfService.js";
import { sendBookingEmail } from "../services/mailService.js";
import { createNotification } from "./notificationController.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import expressAsyncHandler from "express-async-handler";
dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const CLASS_MULTIPLIER = { economy: 1, business: 2.5, first: 4.5 };

// ── GET /api/bookings/my ───────────────────────────────
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Bookings.find({ passengerId: req.user._id })
      .populate(
        "flightId",
        "flightNumber source destination departureTime arrivalTime status routes aircraftId",
      )
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /api/bookings/:id ──────────────────────────────
export const getBookingById = async (req, res) => {
  try {
    const booking = await Bookings.findById(req.params.id)
      .populate({
        path: "flightId",
        populate: {
          path: "aircraftId",
          model: "aircrafts",
        },
      })
      .populate("passengerId", "name email phone");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (
      String(booking.passengerId._id) !== String(req.user._id) &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorised" });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET /api/bookings/flight/:flightId/seats                                  */
/*  Returns all booked seats for a flight, grouped by class.                  */
/*  Used by the seat map on the booking page.                                  */
/* -------------------------------------------------------------------------- */
export const getFlightSeats = async (req, res) => {
  try {
    const { flightId } = req.params;

    const flight = await Flights.findById(flightId).select(
      "totalSeats availableSeats status",
    );

    if (!flight) {
      return res
        .status(404)
        .json({ success: false, message: "Flight not found" });
    }

    // Fetch all non-cancelled bookings for this flight
    const bookings = await Bookings.find({
      flightId,
      status: { $nin: ["cancelled"] },
    }).select("seats seatClass");

    // Flat list of booked seat strings e.g. ["10A", "10B", "4C"]
    const bookedSeats = bookings.flatMap((b) => b.seats);

    // Grouped by class — useful if frontend wants per-class breakdown
    const byClass = { economy: [], business: [], first: [] };
    bookings.forEach((b) => {
      const cls = b.seatClass || "economy";
      if (byClass[cls]) byClass[cls].push(...b.seats);
    });

    res.status(200).json({
      success: true,
      data: {
        bookedSeats, // all booked seats flat
        byClass, // booked seats grouped by class
        totalSeats: flight.totalSeats,
        availableSeats: flight.availableSeats,
        flightStatus: flight.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/bookings/create-order ───────────────────
export const createOrder = async (req, res) => {
  try {
    const { flightId, passengers, seats, seatClass } = req.body;

    if (!flightId || !passengers?.length || !seats?.length) {
      return res.status(400).json({
        success: false,
        message: "flightId, passengers and seats are required",
      });
    }

    const flight = await Flights.findById(flightId);
    if (!flight) {
      return res
        .status(404)
        .json({ success: false, message: "Flight not found" });
    }

    if (!["scheduled", "boarding"].includes(flight.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot book a flight with status: ${flight.status}`,
      });
    }

    if (flight.availableSeats < passengers.length) {
      return res.status(400).json({
        success: false,
        message: `Only ${flight.availableSeats} seat(s) available`,
      });
    }

    // Check seats not already booked
    const existing = await Bookings.find({
      flightId,
      status: { $nin: ["cancelled"] },
      seats: { $in: seats },
    });
    if (existing.length > 0) {
      const taken = existing
        .flatMap((b) => b.seats)
        .filter((s) => seats.includes(s));
      return res.status(400).json({
        success: false,
        message: `Seats already booked: ${taken.join(", ")}`,
      });
    }

    const multiplier = CLASS_MULTIPLIER[seatClass] || 1;
    const totalAmount = Math.round(
      flight.price * multiplier * passengers.length,
    );

    const order = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: `booking_${Date.now()}`,
      notes: { flightId: String(flightId), userId: String(req.user._id) },
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: totalAmount,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID,
        bookingMeta: { flightId, passengers, seats, seatClass, totalAmount },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/bookings/verify-payment ─────────────────
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      flightId,
      passengers,
      seats,
      seatClass,
      totalAmount,
    } = req.body;

    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generated !== razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed — invalid signature",
      });
    }

    const flight = await Flights.findById(flightId);
    if (!flight) {
      return res
        .status(404)
        .json({ success: false, message: "Flight not found" });
    }

    flight.availableSeats = Math.max(
      0,
      flight.availableSeats - passengers.length,
    );
    await flight.save();

    const booking = await Bookings.create({
      passengerId: req.user._id,
      flightId,
      passengers,
      passengerCount: passengers.length,
      seats,
      seatClass,
      totalAmount,
      status: "confirmed",
      paymentStatus: "paid",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    await createNotification({
      recipient: req.user._id,
      title: "Booking confirmed",
      message: `Your booking ${booking.bookingReference} for ${flight.source} → ${flight.destination} is confirmed.`,
      type: "booking",
      relatedId: booking._id,
      relatedModel: "bookings",
    });

    let loyalty = await Loyalty.findOne();

    const populated = await booking.populate(
      "flightId",
      "flightNumber source destination departureTime arrivalTime price",
    );

    res.status(201).json({ success: true, data: populated });

    (async () => {
      try {
        console.log(
          `[booking] Generating PDFs for ${booking.bookingReference}...`,
        );

        const { boardingPasses, ticket, invoice } = await generateBookingPDFs(
          populated,
          populated.flightId,
        );

        console.log(`[booking] Sending email → ${passengers[0]?.email}`);

        await sendBookingEmail({
          booking: populated,
          flight: populated.flightId,
          boardingPasses,
          ticket,
          invoice,
        });

        console.log(`[booking] ✓ Email sent for ${booking.bookingReference}`);
      } catch (err) {
        console.error(
          `[booking] PDF/email error for ${booking.bookingReference}:`,
          err.message,
        );
      }
    })();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /api/bookings/:id/cancel ─────────────────────
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Bookings.findById(req.params.id).populate("flightId");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (String(booking.passengerId) !== String(req.user._id)) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorised" });
    }

    if (booking.status === "cancelled") {
      return res
        .status(400)
        .json({ success: false, message: "Booking already cancelled" });
    }

    if (booking.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Cannot cancel a completed booking" });
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

    // Update booking
    booking.status = "cancelled";
    booking.cancelledAt = new Date();
    booking.paymentStatus = "refunded";

    await booking.save();

    await createNotification({
      recipient: req.user._id,
      title: "Booking cancelled",
      message: `Your booking ${booking.bookingReference} has been cancelled. Refund will be processed shortly.`,
      type: "refund",
      relatedId: booking._id,
      relatedModel: "bookings",
    });

    // Restore seats
    await Flights.findByIdAndUpdate(flight._id, {
      $inc: { availableSeats: booking.passengerCount },
    });

    // Create refund entry
    const refund = await Refunds.create({
      passengerId: booking.passengerId,
      bookingId: booking._id,
      amount: booking.totalAmount,
      reason: booking.cancellationReason,
      status: "processed",
      processedAt: new Date(),
    });

    // Passenger notification
    await Notifications.create({
      recipient: booking.passengerId,
      roleTarget: "passenger",
      title: "Refund Processed",
      message: `Refund of ₹${booking.totalAmount} has been processed for booking ${booking.bookingReference}`,
      type: "refund",
      relatedId: refund._id,
      relatedModel: "refunds",
    });

    // Admin notification
    await Notifications.create({
      roleTarget: "admin",
      title: "Booking Cancelled",
      message: `${booking.bookingReference} has been cancelled and refunded.`,
      type: "refund",
      relatedId: refund._id,
      relatedModel: "refunds",
      sentBy: booking.passengerId,
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled and refund processed",
      data: {
        booking,
        refund,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ── GET /api/bookings/stats (admin) ───────────────────
export const getBookingStats = async (req, res) => {
  try {
    const [total, confirmed, cancelled, completed, revenue] = await Promise.all(
      [
        Bookings.countDocuments(),
        Bookings.countDocuments({ status: "confirmed" }),
        Bookings.countDocuments({ status: "cancelled" }),
        Bookings.countDocuments({ status: "completed" }),
        Bookings.aggregate([
          { $match: { paymentStatus: "paid" } },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
      ],
    );

    res.status(200).json({
      success: true,
      data: {
        total,
        confirmed,
        cancelled,
        completed,
        revenue: revenue[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* -------------------------------------------------------------------------- */
/*  SHARED: load + authorise booking for download                             */
/* -------------------------------------------------------------------------- */
async function loadBookingForDownload(bookingId, userId) {
  const booking = await Bookings.findById(bookingId).populate(
    "flightId",
    "flightNumber source destination departureTime arrivalTime price routes",
  );

  if (!booking) throw { status: 404, message: "Booking not found" };

  if (String(booking.passengerId) !== String(userId)) {
    throw { status: 403, message: "Not authorised" };
  }

  return booking;
}

/* -------------------------------------------------------------------------- */
/*  GET /api/bookings/:id/download/boarding-pass                              */
/*  Returns a multi-page PDF — one boarding pass per passenger                */
/* -------------------------------------------------------------------------- */
export const downloadBoardingPass = async (req, res) => {
  try {
    const booking = await loadBookingForDownload(req.params.id, req.user._id);
    const { boardingPasses } = await generateBookingPDFs(
      booking,
      booking.flightId,
    );

    // Merge all boarding pass pages into one PDF response
    // Each Buffer is a valid single-page PDF — send the first passenger's
    // if 1 passenger, otherwise send all as separate files via zip would be
    // complex; instead we regenerate as a single multi-passenger PDF by
    // sending them concatenated. For simplicity we send pass[0] for 1 pax
    // and all individually named if multi — here we send pax 1 only and
    // let the client call per-passenger index via query param.
    const passengerIndex = Number(req.query.passenger ?? 0);
    const pdf = boardingPasses[passengerIndex] ?? boardingPasses[0];
    const passengerName =
      booking.passengers[passengerIndex]?.name ?? "passenger";

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="boarding-pass-${passengerName.replace(/\s+/g, "-")}-${booking.bookingReference}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.end(pdf);
  } catch (err) {
    res
      .status(err.status ?? 500)
      .json({ success: false, message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET /api/bookings/:id/download/ticket                                     */
/* -------------------------------------------------------------------------- */
export const downloadTicket = async (req, res) => {
  try {
    const booking = await loadBookingForDownload(req.params.id, req.user._id);
    const { ticket } = await generateBookingPDFs(booking, booking.flightId);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="e-ticket-${booking.bookingReference}.pdf"`,
      "Content-Length": ticket.length,
    });
    res.end(ticket);
  } catch (err) {
    res
      .status(err.status ?? 500)
      .json({ success: false, message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET /api/bookings/:id/download/invoice                                    */
/* -------------------------------------------------------------------------- */
export const downloadInvoice = async (req, res) => {
  try {
    const booking = await loadBookingForDownload(req.params.id, req.user._id);
    const { invoice } = await generateBookingPDFs(booking, booking.flightId);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${booking.bookingReference}.pdf"`,
      "Content-Length": invoice.length,
    });
    res.end(invoice);
  } catch (err) {
    res
      .status(err.status ?? 500)
      .json({ success: false, message: err.message });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET /api/bookings/flight/:flightId  (admin)                               */
/*  Full booking + passenger + user details for a specific flight.            */
/* -------------------------------------------------------------------------- */
export const getBookingsByFlightId = expressAsyncHandler(async (req, res) => {
  try {
    const { flightId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const query = { flightId };
    if (status && status !== "all") query.status = status;

    const total = await Bookings.countDocuments(query);

    const bookings = await Bookings.find(query)
      .populate({
        path: "passengerId",
        select: "name email phone role createdAt",
      })
      .populate({
        path: "flightId",
        select:
          "flightNumber source destination departureTime arrivalTime status price totalSeats availableSeats",
        populate: {
          path: "aircraftId",
          select: "registrationNumber model capacity",
        },
      })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    /* ── Flight-level booking stats ── */
    const mongoose = (await import("mongoose")).default;
    const fid = new mongoose.Types.ObjectId(flightId);

    const [confirmed, cancelled, completed, revenueAgg] = await Promise.all([
      Bookings.countDocuments({ flightId, status: "confirmed" }),
      Bookings.countDocuments({ flightId, status: "cancelled" }),
      Bookings.countDocuments({ flightId, status: "completed" }),
      Bookings.aggregate([
        { $match: { flightId: fid, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      stats: {
        total,
        confirmed,
        cancelled,
        completed,
        revenue: revenueAgg[0]?.total || 0,
      },
      data: bookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
