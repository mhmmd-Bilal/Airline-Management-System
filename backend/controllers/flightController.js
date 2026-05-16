// controllers/flightController.js
import Flights from "../models/flightsModel.js";
import expressAsyncHandler from "express-async-handler";

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
      { source:       { $regex: search, $options: "i" } },
      { destination:  { $regex: search, $options: "i" } },
    ];
  }

  const total   = await Flights.countDocuments(query);
  const flights = await Flights.find(query)
    .populate("aircraftId", "registrationNumber model capacity")
    .populate({
      path:     "crewIds",
      select:   "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    })
    .sort({ departureTime: 1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success:    true,
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       flights,
  });
});

// ── @desc    Get single flight by ID
// ── @route   GET /api/flights/:id
// ── @access  Admin / Crew
export const getFlightById = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id)
    .populate("aircraftId", "registrationNumber model capacity status")
    .populate({
      path:     "crewIds",
      select:   "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    });

  if (!flight) {
    return res.status(404).json({ success: false, message: "Flight not found" });
  }

  res.status(200).json({ success: true, data: flight });
});

// ── @desc    Get flight stats
// ── @route   GET /api/flights/stats
// ── @access  Admin
export const getFlightStats = expressAsyncHandler(async (req, res) => {
  const [
    total, scheduled, delayed, boarding, inFlight, completed, cancelled,
  ] = await Promise.all([
    Flights.countDocuments(),
    Flights.countDocuments({ status: "scheduled"  }),
    Flights.countDocuments({ status: "delayed"    }),
    Flights.countDocuments({ status: "boarding"   }),
    Flights.countDocuments({ status: "in-flight"  }),
    Flights.countDocuments({ status: "completed"  }),
    Flights.countDocuments({ status: "cancelled"  }),
  ]);

  res.status(200).json({
    success: true,
    data: { total, scheduled, delayed, boarding, inFlight, completed, cancelled },
  });
});

// ── @desc    Create a new flight
// ── @route   POST /api/flights
// ── @access  Admin
export const createFlight = expressAsyncHandler(async (req, res) => {
  const {
    flightNumber, source, destination, routes,
    currentStop, departureTime, arrivalTime,
    status, aircraftId, crewIds, totalSeats, price,
  } = req.body;

  // ── Required field validation ──
  if (!flightNumber || !source || !destination || !departureTime || !arrivalTime || !totalSeats || !price) {
    return res.status(400).json({
      success: false,
      message: "flightNumber, source, destination, departureTime, arrivalTime, totalSeats and price are required",
    });
  }

  // ── Arrival must be after departure ──
  if (new Date(arrivalTime) <= new Date(departureTime)) {
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
    const activeStatuses   = ["scheduled", "boarding", "in-flight", "delayed"];
    const aircraftConflict = await Flights.findOne({
      aircraftId,
      status: { $in: activeStatuses },
    });
    if (aircraftConflict) {
      return res.status(400).json({
        success: false,
        message: `Aircraft is already assigned to flight ${aircraftConflict.flightNumber} which is currently ${aircraftConflict.status}`,
      });
    }
  }

  // ── Default currentStop to first route stop or source ──
  const resolvedRoutes      = routes || [];
  const resolvedCurrentStop = currentStop
    || (resolvedRoutes.length > 0 ? resolvedRoutes[0] : source);

  const flight = await Flights.create({
    flightNumber,
    source,
    destination,
    routes:         resolvedRoutes,
    currentStop:    resolvedCurrentStop,
    departureTime,
    arrivalTime,
    status:         status || "scheduled",
    aircraftId:     aircraftId || null,
    crewIds:        crewIds   || [],
    totalSeats,
    availableSeats: totalSeats,         // always start full
    price,
  });

  const populated = await flight.populate([
    { path: "aircraftId", select: "registrationNumber model capacity" },
    {
      path:     "crewIds",
      select:   "userId role employeeId currentStatus",
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
  if (!flight) {
    return res.status(404).json({ success: false, message: "Flight not found" });
  }

  // ── Block updates on terminal statuses ──
  if (["completed", "cancelled"].includes(flight.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot update a flight that is already ${flight.status}`,
    });
  }

  const {
    flightNumber, source, destination, routes,
    currentStop, departureTime, arrivalTime,
    status, aircraftId, crewIds, totalSeats, price,
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
  const newDeparture = departureTime ? new Date(departureTime) : flight.departureTime;
  const newArrival   = arrivalTime   ? new Date(arrivalTime)   : flight.arrivalTime;
  if (newArrival <= newDeparture) {
    return res.status(400).json({
      success: false,
      message: "Arrival time must be after departure time",
    });
  }

  // ── Validate currentStop is in routes ──
  const resolvedRoutes = routes ?? flight.routes;
  if (currentStop && resolvedRoutes.length > 0 && !resolvedRoutes.includes(currentStop)) {
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
    const isLast  = currentStop === resolvedRoutes[resolvedRoutes.length - 1];

    if (isFirst) {
      derivedStatus = "boarding";
    } else if (!isLast) {
      // mid-stop → in-flight
      derivedStatus = "in-flight";
    }
    // isLast → do NOT set completed here; cron handles it
    // keep derivedStatus as the current flight.status
  }

  // ── Apply updates ──
  flight.flightNumber  = flightNumber  ?? flight.flightNumber;
  flight.source        = source        ?? flight.source;
  flight.destination   = destination   ?? flight.destination;
  flight.routes        = routes        ?? flight.routes;
  flight.currentStop   = currentStop   ?? flight.currentStop;
  flight.departureTime = departureTime ?? flight.departureTime;
  flight.arrivalTime   = arrivalTime   ?? flight.arrivalTime;
  flight.status        = derivedStatus;
  flight.aircraftId    = aircraftId    ?? flight.aircraftId;
  flight.crewIds       = crewIds       ?? flight.crewIds;
  flight.totalSeats    = totalSeats    ?? flight.totalSeats;
  flight.price         = price         ?? flight.price;

  const updated   = await flight.save();
  const populated = await updated.populate([
    { path: "aircraftId", select: "registrationNumber model capacity" },
    {
      path:     "crewIds",
      select:   "userId role employeeId currentStatus",
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
    return res.status(404).json({ success: false, message: "Flight not found" });
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
  const { crewId } = req.params;                         // moved to params, not query
  const { status, page = 1, limit = 10 } = req.query;

  const query = { crewIds: crewId };
  if (status && status !== "all") query.status = status;

  const total   = await Flights.countDocuments(query);
  const flights = await Flights.find(query)
    .populate("aircraftId", "registrationNumber model capacity")
    .populate({
      path:     "crewIds",
      select:   "userId role employeeId currentStatus",
      populate: { path: "userId", select: "name email phone" },
    })
    .sort({ departureTime: -1 })                         // most recent first
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success:    true,
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       flights,
  });
});


// add to flightController.js
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
      source:         { $regex: source,      $options: "i" },
      destination:    { $regex: destination, $options: "i" },
      departureTime:  { $gte: dayStart, $lte: dayEnd },
      status:         { $in: ["scheduled", "boarding"] },
      availableSeats: { $gte: Number(passengers) },
    })
      .populate("aircraftId", "registrationNumber model capacity")
      .sort({ departureTime: 1 });

    // attach class prices
    const CLASS_MULTIPLIER = { economy: 1, business: 2.5, first: 4.5 };

    const data = flights.map((f) => ({
      ...f.toObject(),
      classPrices: {
        economy:  Math.round(f.price * CLASS_MULTIPLIER.economy),
        business: Math.round(f.price * CLASS_MULTIPLIER.business),
        first:    Math.round(f.price * CLASS_MULTIPLIER.first),
      },
    }));

    res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};