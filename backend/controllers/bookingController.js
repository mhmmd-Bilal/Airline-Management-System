// controllers/bookingController.js
import Bookings from "../models/bookingModel.js";
import Flights from "../models/flightsModel.js";
import Loyalty from '../models/loyaltyModel.js'
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
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
      .populate("flightId")
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

    let loyalty = await Loyalty.findOne()

    const populated = await booking.populate(
      "flightId",
      "flightNumber source destination departureTime arrivalTime",
    );

    res.status(201).json({ success: true, data: populated });
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

    booking.status = "cancelled";
    booking.cancellationReason = req.body.reason || "Cancelled by passenger";
    booking.cancelledAt = new Date();
    booking.paymentStatus = "refunded";
    await booking.save();

    await Flights.findByIdAndUpdate(flight._id, {
      $inc: { availableSeats: booking.passengerCount },
    });

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
