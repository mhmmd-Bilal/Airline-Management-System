// controllers/flightController.js
import Bookings from "../models/bookingModel.js";
import Crews from "../models/crewModel.js";
import Flights from "../models/flightsModel.js";
import Attendance from "../models/attendanceModel.js";
import expressAsyncHandler from "express-async-handler";
import { sendCrewAssignmentEmailsForFlight } from "../services/mailService.js";
import { createNotification } from "../controllers/notificationController.js";

// ── @desc    Get all flights (paginated, filtered, searched)
// ── @route   GET /api/flights
// ── @access  Admin / Crew
export const getAllFlights = expressAsyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;

  const query = {};
  if (status && status !== "all") query.status = status;
  if (search) {
    query.$or = [
      { flightNumber: { $regex: search, $options: "i" } },
      { source: { $regex: search, $options: "i" } },
      { destination: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Flights.countDocuments(query);
  const flights = await Flights.find(query)
    .populate("aircraftId", "registrationNumber model capacity")
    .populate({
      path: "crewIds",
      select: "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    })
    .sort({ departureTime: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: flights,
  });
});

// ── @desc    Get single flight by ID
// ── @route   GET /api/flights/:id
// ── @access  Admin / Crew
export const getFlightById = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id)
    .populate("aircraftId", "registrationNumber model capacity status")
    .populate({
      path: "crewIds",
      select: "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    });

  if (!flight) {
    return res
      .status(404)
      .json({ success: false, message: "Flight not found" });
  }

  res.status(200).json({ success: true, data: flight });
});

// ── @desc    Get flight stats
// ── @route   GET /api/flights/stats
// ── @access  Admin
export const getFlightStats = expressAsyncHandler(async (req, res) => {
  // today start/end
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [
    total,
    scheduled,
    delayed,
    boarding,
    inFlight,
    completed,
    cancelled,

    // today stats
    todayTotal,
    todayScheduled,
    todayDelayed,
    todayBoarding,
    todayInFlight,
    todayCompleted,
    todayCancelled,
  ] = await Promise.all([
    // overall stats
    Flights.countDocuments(),
    Flights.countDocuments({ status: "scheduled" }),
    Flights.countDocuments({ status: "delayed" }),
    Flights.countDocuments({ status: "boarding" }),
    Flights.countDocuments({ status: "in-flight" }),
    Flights.countDocuments({ status: "completed" }),
    Flights.countDocuments({ status: "cancelled" }),

    // today stats
    Flights.countDocuments({
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),

    Flights.countDocuments({
      status: "scheduled",
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),

    Flights.countDocuments({
      status: "delayed",
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),

    Flights.countDocuments({
      status: "boarding",
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),

    Flights.countDocuments({
      status: "in-flight",
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),

    Flights.countDocuments({
      status: "completed",
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),

    Flights.countDocuments({
      status: "cancelled",
      departureTime: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      // existing response
      total,
      scheduled,
      delayed,
      boarding,
      inFlight,
      completed,
      cancelled,

      // today stats
      today: {
        total: todayTotal,
        scheduled: todayScheduled,
        delayed: todayDelayed,
        boarding: todayBoarding,
        inFlight: todayInFlight,
        completed: todayCompleted,
        cancelled: todayCancelled,
      },
    },
  });
});

// ── @desc    Create a new flight
// ── @route   POST /api/flights
// ── @access  Admin
export const createFlight = expressAsyncHandler(async (req, res) => {
  const {
    flightNumber,
    source,
    destination,
    routes,
    currentStop,
    departureTime,
    arrivalTime,
    status,
    aircraftId,
    crewIds,
    totalSeats,
    price,
  } = req.body;

  // ── Required field validation ──
  if (
    !flightNumber ||
    !source ||
    !destination ||
    !departureTime ||
    !arrivalTime ||
    !totalSeats ||
    !price
  ) {
    return res.status(400).json({
      success: false,
      message:
        "flightNumber, source, destination, departureTime, arrivalTime, totalSeats and price are required",
    });
  }

  const newDep = new Date(departureTime);
  const newArr = new Date(arrivalTime);

  // ── Arrival must be after departure ──
  if (newArr <= newDep) {
    return res.status(400).json({
      success: false,
      message: "Arrival time must be after departure time",
    });
  }

  // ── Flight number must be unique ──
  const existingByNumber = await Flights.findOne({ flightNumber });
  if (existingByNumber) {
    return res.status(400).json({
      success: false,
      message: `Flight number ${flightNumber} already exists`,
    });
  }

  // ── Aircraft must not be active on another flight ──
  if (aircraftId) {
    const activeStatuses = ["scheduled", "boarding", "in-flight", "delayed"];
    const aircraftConflict = await Flights.findOne({
      aircraftId,
      status: { $in: activeStatuses },
    });
    if (aircraftConflict) {
      return res.status(400).json({
        success: false,
        message: `Aircraft is already assigned to flight ${aircraftConflict.flightNumber} (${aircraftConflict.status})`,
      });
    }
  }

  // ── Crew availability check ─────────────────────────────────────────────────
  // A crew member is considered UNAVAILABLE if they are already assigned to
  // another flight whose time window overlaps with the new flight's window.
  //
  // Overlap condition (two intervals [A_dep, A_arr] and [B_dep, B_arr] overlap):
  //   A_dep < B_arr  AND  A_arr > B_dep
  //
  // We only check flights in active/upcoming statuses — no point checking
  // completed or cancelled flights.
  // ────────────────────────────────────────────────────────────────────────────
  if (crewIds && crewIds.length > 0) {
    const busyStatuses = ["scheduled", "boarding", "in-flight", "delayed"];

    // Find any flight that:
    //  1. contains at least one of our requested crew members
    //  2. is in an active status
    //  3. time window overlaps with the new flight's window
    const conflictingFlights = await Flights.find({
      crewIds: { $in: crewIds },
      status: { $in: busyStatuses },
      departureTime: { $lt: newArr }, // existing flight departs before new one arrives
      arrivalTime: { $gt: newDep }, // existing flight arrives after new one departs
    })
      .select(
        "flightNumber source destination departureTime arrivalTime status crewIds",
      )
      .lean();

    if (conflictingFlights.length > 0) {
      // Build a per-crew conflict map so the error message is specific
      const conflictMap = {}; // crewId → [conflicting flight descriptions]

      for (const conflict of conflictingFlights) {
        for (const cId of conflict.crewIds) {
          const cIdStr = String(cId);
          // Only flag crew members that are in BOTH the requested list and this conflict
          if (crewIds.map(String).includes(cIdStr)) {
            if (!conflictMap[cIdStr]) conflictMap[cIdStr] = [];
            conflictMap[cIdStr].push(
              `${conflict.flightNumber} (${conflict.source}→${conflict.destination}, ` +
                `${new Date(conflict.departureTime).toISOString().slice(0, 16).replace("T", " ")} – ` +
                `${new Date(conflict.arrivalTime).toISOString().slice(0, 16).replace("T", " ")}, ` +
                `${conflict.status})`,
            );
          }
        }
      }

      // Populate crew names for a readable error
      const Crews = (await import("../models/crewModel.js")).default;
      const conflictCrewIds = Object.keys(conflictMap);
      const crewDocs = await Crews.find({ _id: { $in: conflictCrewIds } })
        .populate("userId", "name")
        .lean();

      const crewNameMap = {};
      crewDocs.forEach((c) => {
        crewNameMap[String(c._id)] =
          c.userId?.name ?? c.employeeId ?? String(c._id);
      });

      const lines = conflictCrewIds.map(
        (cId) => `• ${crewNameMap[cId] ?? cId}: ${conflictMap[cId].join(", ")}`,
      );

      return res.status(400).json({
        success: false,
        message:
          `The following crew member${lines.length > 1 ? "s are" : " is"} already ` +
          `assigned to overlapping flight${lines.length > 1 ? "s" : ""}:\n${lines.join("\n")}`,
        conflicts: conflictCrewIds.map((cId) => ({
          crewId: cId,
          name: crewNameMap[cId] ?? cId,
          flights: conflictMap[cId],
        })),
      });
    }
  }

  // ── Default currentStop to first route stop or source ──
  const resolvedRoutes = routes || [];
  const resolvedCurrentStop =
    currentStop || (resolvedRoutes.length > 0 ? resolvedRoutes[0] : source);

  const flight = await Flights.create({
    flightNumber,
    source,
    destination,
    routes: resolvedRoutes,
    currentStop: resolvedCurrentStop,
    departureTime,
    arrivalTime,
    status: status || "scheduled",
    aircraftId: aircraftId || null,
    crewIds: crewIds || [],
    totalSeats,
    availableSeats: totalSeats,
    price,
  });

  const crews = await Crews.find({
    _id: { $in: crewIds },
  }).select("userId");

  await Promise.all(
    crews.map((crew) =>
      createNotification({
        recipient: crew.userId,
        roleTarget: "crew",
        title: "New Flight Assigned",
        message: `You have been assigned to flight ${flight.flightNumber}. Please check your schedule.`,
        type: "flight",
        relatedId: flight._id,
        relatedModel: "flights",
        sentBy: req.user._id,
      }),
    ),
  );

  if (crewIds?.length) {
    sendCrewAssignmentEmailsForFlight(crewIds, flight).catch((err) =>
      console.error("[createFlight] Email error:", err.message),
    );
  }

  const populated = await flight.populate([
    { path: "aircraftId", select: "registrationNumber model capacity" },
    {
      path: "crewIds",
      select: "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    },
  ]);

  res.status(201).json({ success: true, data: populated });
});

// ── @desc    Update a flight
// ── @route   PUT /api/flights/:id
// ── @access  Admin
export const updateFlight = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id);
  const previousStatus = flight.status;
  if (!flight) {
    return res
      .status(404)
      .json({ success: false, message: "Flight not found" });
  }

  // ── Block updates on terminal statuses ──
  if (["completed", "cancelled"].includes(flight.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot update a flight that is already ${flight.status}`,
    });
  }

  const {
    flightNumber,
    source,
    destination,
    routes,
    currentStop,
    departureTime,
    arrivalTime,
    status,
    aircraftId,
    crewIds,
    totalSeats,
    price,
  } = req.body;

  // ── Duplicate flightNumber check (only if changing) ──
  if (flightNumber && flightNumber !== flight.flightNumber) {
    const duplicate = await Flights.findOne({ flightNumber });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Flight number ${flightNumber} already exists`,
      });
    }
  }

  // ── Arrival must be after departure ──
  const newDeparture = departureTime
    ? new Date(departureTime)
    : flight.departureTime;
  const newArrival = arrivalTime ? new Date(arrivalTime) : flight.arrivalTime;
  if (newArrival <= newDeparture) {
    return res.status(400).json({
      success: false,
      message: "Arrival time must be after departure time",
    });
  }

  // ── Validate currentStop is in routes ──
  const resolvedRoutes = routes ?? flight.routes;
  if (
    currentStop &&
    resolvedRoutes.length > 0 &&
    !resolvedRoutes.includes(currentStop)
  ) {
    return res.status(400).json({
      success: false,
      message: `"${currentStop}" is not a valid stop. Valid stops: ${resolvedRoutes.join(", ")}`,
    });
  }

  // ── Status derivation from currentStop ────────────────
  // IMPORTANT: never auto-derive "completed" here — that is the cron's job.
  // The cron uses actualArrivalTime so it knows the exact landed time.
  // Deriving completed from currentStop here would bypass that and set
  // actualArrivalTime to null on any manually-completed flight.
  //
  // Only derive boarding / in-flight. Let the cron handle completed.
  let derivedStatus = status ?? flight.status;
  if (currentStop && !status) {
    const isFirst = currentStop === resolvedRoutes[0];
    const isLast = currentStop === resolvedRoutes[resolvedRoutes.length - 1];

    if (isFirst) {
      derivedStatus = "boarding";
    } else if (!isLast) {
      // mid-stop → in-flight
      derivedStatus = "in-flight";
    }
    // isLast → do NOT set completed here; cron handles it
    // keep derivedStatus as the current flight.status
  }

  if (status === "completed") {
    derivedStatus = "completed";
  }

  // ── Apply updates ──
  flight.flightNumber = flightNumber ?? flight.flightNumber;
  flight.source = source ?? flight.source;
  flight.destination = destination ?? flight.destination;
  flight.routes = routes ?? flight.routes;
  flight.currentStop = currentStop ?? flight.currentStop;
  flight.departureTime = departureTime ?? flight.departureTime;
  flight.arrivalTime = arrivalTime ?? flight.arrivalTime;
  flight.status = derivedStatus;
  flight.aircraftId = aircraftId ?? flight.aircraftId;
  flight.crewIds = crewIds ?? flight.crewIds;
  flight.totalSeats = totalSeats ?? flight.totalSeats;
  flight.price = price ?? flight.price;

  if (derivedStatus === "completed" && !flight.actualArrivalTime) {
    flight.actualArrivalTime = new Date();
  }

  const updated = await flight.save();

  if (derivedStatus === "completed") {
    await Bookings.updateMany(
      {
        flightId: req.params.id,
        status: { $ne: "cancelled" },
      },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
        },
      },
    );
    await Attendance.updateMany(
      {
        staffId: { $in: flight.crewIds },
        clockOut: null,
      },
      {
        $set: {
          status: "present",
          activeFlightId: null,
        },
      },
    );
  }

  if (derivedStatus === "boarding") {
    await Attendance.updateMany(
      {
        staffId: { $in: flight.crewIds },
        clockOut: null,
      },
      {
        $set: {
          status: "on-flight",
          activeFlightId: flight._id,
        },
      },
    );
  }

  if (updated.status === "boarding" && previousStatus !== "boarding") {
    await createNotification({
      roleTarget: "passenger", // broadcast to all passengers
      title: "Flight boarding",
      message: `Flight ${updated.flightNumber} (${updated.source} → ${updated.destination}) is now boarding.`,
      type: "flight",
      relatedId: updated._id,
      relatedModel: "flights",
    });
  }

  const populated = await updated.populate([
    { path: "aircraftId", select: "registrationNumber model capacity" },
    {
      path: "crewIds",
      select: "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    },
  ]);

  res.status(200).json({ success: true, data: populated });
});

// ── @desc    Delete a flight
// ── @route   DELETE /api/flights/:id
// ── @access  Admin
export const deleteFlight = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id);
  if (!flight) {
    return res
      .status(404)
      .json({ success: false, message: "Flight not found" });
  }

  // ── Block deletion for live statuses ──
  const nonDeletable = ["boarding", "in-flight", "delayed"];
  if (nonDeletable.includes(flight.status)) {
    return res.status(400).json({
      success: false,
      message: `Flight ${flight.flightNumber} cannot be deleted while it is ${flight.status}. Only scheduled, completed or cancelled flights can be deleted.`,
    });
  }

  // ── Block deletion for scheduled flights — must cancel first ──
  if (flight.status === "scheduled") {
    return res.status(400).json({
      success: false,
      message: `Flight ${flight.flightNumber} is scheduled. Cancel it before deleting.`,
    });
  }

  await flight.deleteOne();

  res.status(200).json({
    success: true,
    message: `Flight ${flight.flightNumber} (${flight.source} → ${flight.destination}) deleted successfully.`,
  });
});

// ── @desc    Get flights assigned to a specific crew member
// ── @route   GET /api/flights/crew/:crewId
// ── @access  Admin / Crew
export const getFlightsByCrewId = expressAsyncHandler(async (req, res) => {
  const { crewId } = req.params; // moved to params, not query
  const { status, page = 1, limit = 10 } = req.query;

  const query = { crewIds: crewId };
  if (status && status !== "all") query.status = status;

  const total = await Flights.countDocuments(query);
  const flights = await Flights.find(query)
    .populate("aircraftId", "registrationNumber model capacity")
    .populate({
      path: "crewIds",
      select: "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    })
    .sort({ departureTime: -1 }) // most recent first
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: flights,
  });
});

// ── GET /api/flights/search ────────────────────────────
export const searchFlights = async (req, res) => {
  try {
    const { source, destination, date, seatClass, passengers = 1 } = req.query;

    if (!source || !destination || !date) {
      return res.status(400).json({
        success: false,
        message: "source, destination and date are required",
      });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const flights = await Flights.find({
      source: { $regex: source, $options: "i" },
      destination: { $regex: destination, $options: "i" },
      departureTime: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["scheduled", "boarding"] },
      availableSeats: { $gte: Number(passengers) },
    })
      .populate("aircraftId", "registrationNumber model capacity")
      .sort({ departureTime: 1 });

    // attach class prices
    const CLASS_MULTIPLIER = { economy: 1, business: 2.5, first: 4.5 };

    const data = flights.map((f) => ({
      ...f.toObject(),
      classPrices: {
        economy: Math.round(f.price * CLASS_MULTIPLIER.economy),
        business: Math.round(f.price * CLASS_MULTIPLIER.business),
        first: Math.round(f.price * CLASS_MULTIPLIER.first),
      },
    }));

    res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookedFlights = expressAsyncHandler(async (req, res) => {
  const userId = req.user._id;

  const bookings = await Bookings.find({
    passengerId: userId,
  });

  // remove duplicates
  const flightIds = [
    ...new Set(bookings.map((booking) => booking.flightId.toString())),
  ];

  const flights = await Flights.find({
    _id: { $in: flightIds },
  });

  res.status(200).json({
    success: true,
    count: flights.length,
    data: flights,
    bookings,
  });
});

// ── @desc    Track flight for logged-in passenger
// ── @route   GET /api/flights/track/:flightId
// ── @access  Private
export const trackMyFlight = expressAsyncHandler(async (req, res) => {
  const { flightId } = req.params;

  // find booking of this user for this flight
  const booking = await Bookings.findOne({
    passengerId: req.user._id,
    flightId,
    status: { $ne: "cancelled" },
  });

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "No valid booking found for this flight",
    });
  }

  const flight = await Flights.findById(flightId)
    .populate("aircraftId", "registrationNumber model")
    .populate({
      path: "crewIds",
      select: "role employeeId",
      populate: {
        path: "userId",
        select: "name",
      },
    });

  if (!flight) {
    return res.status(404).json({
      success: false,
      message: "Flight not found",
    });
  }

  // full route
  const stops =
    flight.routes?.length > 0
      ? flight.routes
      : [flight.source, flight.destination];

  // progress percentage
  const now = new Date();

  const totalDuration =
    new Date(flight.arrivalTime) - new Date(flight.departureTime);

  const completedDuration = now - new Date(flight.departureTime);

  let progress = Math.round((completedDuration / totalDuration) * 100);

  progress = Math.max(0, Math.min(progress, 100));

  res.status(200).json({
    success: true,

    data: {
      booking: {
        id: booking._id,
        bookingReference: booking.bookingReference,
        seats: booking.seats,
        passengerCount: booking.passengerCount,
        seatClass: booking.seatClass,
      },

      flight: {
        _id: flight._id,
        flightNumber: flight.flightNumber,
        source: flight.source,
        destination: flight.destination,
        routes: stops,
        currentStop: flight.currentStop,
        status: flight.status,
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        actualArrivalTime: flight.actualArrivalTime,
        progress,
        aircraft: flight.aircraftId,
        totalSeats: flight.totalSeats,
        availableSeats: flight.availableSeats,
      },
    },
  });
});
