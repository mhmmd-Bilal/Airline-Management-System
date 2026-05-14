import Crews from "../models/crewModel.js";
import Flights from "../models/flightsModel.js";
import expressAsyncHandler from "express-async-handler";

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
      populate: {
        path: "userId",
        select: "name email phone",
      },
    })
    .sort({ departureTime: 1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / limit),
    data: flights,
  });
});

export const getFlightById = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id)
    .populate("aircraftId", "registrationNumber model capacity status")
    .populate("crewIds", "name email role");

  if (!flight) {
    return res
      .status(404)
      .json({ success: false, message: "Flight not found" });
  }

  res.status(200).json({ success: true, data: flight });
});

export const getFlightStats = expressAsyncHandler(async (req, res) => {
  const [total, scheduled, delayed, boarding, inFlight, completed, cancelled] =
    await Promise.all([
      Flights.countDocuments(),
      Flights.countDocuments({ status: "scheduled" }),
      Flights.countDocuments({ status: "delayed" }),
      Flights.countDocuments({ status: "boarding" }),
      Flights.countDocuments({ status: "in-flight" }),
      Flights.countDocuments({ status: "completed" }),
      Flights.countDocuments({ status: "cancelled" }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      scheduled,
      delayed,
      boarding,
      inFlight,
      completed,
      cancelled,
    },
  });
});

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

  if (new Date(arrivalTime) <= new Date(departureTime)) {
    return res.status(400).json({
      success: false,
      message: "Arrival time must be after departure time",
    });
  }

  const existing = await Flights.findOne({ aircraftId });
  const activeStatuses = ["scheduled", "boarding", "in-flight", "delayed"];

  if (existing && activeStatuses.includes(existing.status)) {
    // ── Block if the existing flight is still active ──
    return res.status(400).json({
      success: false,
      message: `Flight ${flightNumber} already exists and is currently ${existing.status}. Cannot create a duplicate while the flight is active.`,
    });

    // ── Allow re-use only if completed or cancelled ──
    // But the flight number must still be unique in DB,
    // so block entirely — same number can't exist twice regardless
    // return res.status(400).json({
    //   success: false,
    //   message: `Flight number ${flightNumber} already exists (status: ${existing.status}). Please use a different flight number or delete the existing record first.`,
    // });
  }

  const flight = await Flights.create({
    flightNumber,
    source,
    destination,
    routes: routes || [],
    currentStop: currentStop || (routes?.length > 0 ? routes[0] : source),
    departureTime,
    arrivalTime,
    status: status || "scheduled",
    aircraftId: aircraftId || null,
    crewIds: crewIds || [],
    totalSeats,
    availableSeats: totalSeats,
    price,
  });

  const populated = await flight.populate([
    { path: "aircraftId", select: "registrationNumber model capacity" },
    { path: "crewIds", select: "name email role" },
  ]);

  res.status(201).json({ success: true, data: populated });
});

export const updateFlight = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id);
  if (!flight) {
    return res
      .status(404)
      .json({ success: false, message: "Flight not found" });
  }

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

  // duplicate flightNumber check if it's changing
  if (flightNumber && flightNumber !== flight.flightNumber) {
    const duplicate = await Flights.findOne({ flightNumber });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Flight number ${flightNumber} already exists`,
      });
    }
  }

  // arrival after departure check
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

  // if currentStop is being updated, validate it's in routes
  if (
    currentStop &&
    flight.routes.length > 0 &&
    !flight.routes.includes(currentStop)
  ) {
    return res.status(400).json({
      success: false,
      message: `${currentStop} is not a valid stop. Valid stops: ${flight.routes.join(", ")}`,
    });
  }

  // auto-derive status from currentStop if status not explicitly provided
  let derivedStatus = status ?? flight.status;
  if (currentStop && !status) {
    const stopRoutes = routes ?? flight.routes;
    if (currentStop === stopRoutes[0]) {
      derivedStatus = "boarding";
    } else if (currentStop === stopRoutes[stopRoutes.length - 1]) {
      derivedStatus = "completed";
    } else {
      derivedStatus = "in-flight";
    }
  }

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

  const updated = await flight.save();

  const populated = await updated.populate([
    { path: "aircraftId", select: "registrationNumber model capacity" },
    { path: "crewIds", select: "name email role" },
  ]);

  res.status(200).json({ success: true, data: populated });
});

// ── @desc    Assign crew to flight
// ── @route   PATCH /api/flights/:id/crew
// ── @access  Admin
export const assignCrew = expressAsyncHandler(async (req, res) => {
  const { crewIds } = req.body;

  if (!crewIds || !Array.isArray(crewIds)) {
    return res
      .status(400)
      .json({ success: false, message: "crewIds array is required" });
  }

  const flight = await Flights.findByIdAndUpdate(
    req.params.id,
    { crewIds },
    { new: true },
  ).populate("crewIds", "name email role");

  if (!flight) {
    return res
      .status(404)
      .json({ success: false, message: "Flight not found" });
  }

  res.status(200).json({ success: true, data: flight });
});

export const deleteFlight = expressAsyncHandler(async (req, res) => {
  const flight = await Flights.findById(req.params.id);

  if (!flight) {
    return res.status(404).json({
      success: false,
      message: "Flight not found",
    });
  }

  // ── Block deletion for active/live statuses ──────────
  const nonDeletableStatuses = ["boarding", "in-flight", "delayed"];
  if (nonDeletableStatuses.includes(flight.status)) {
    return res.status(400).json({
      success: false,
      message: `Flight ${flight.flightNumber} cannot be deleted because it is currently ${flight.status}. Only scheduled, completed, or cancelled flights can be deleted.`,
    });
  }

  // ── Warn if scheduled — soft guard (optional) ────────
  // Uncomment below if you want to block deleting scheduled flights too
  if (flight.status === "scheduled") {
    return res.status(400).json({
      success: false,
      message: `Flight ${flight.flightNumber} is scheduled. Cancel it before deleting.`,
    });
  }

  await flight.deleteOne();

  res.status(200).json({
    success: true,
    message: `Flight ${flight.flightNumber} (${flight.source} → ${flight.destination}) has been deleted successfully.`,
  });
});

export const getFlightsByCrewId = expressAsyncHandler(async (req, res) => {
  const { crewId } = req.query;

  if (!crewId) {
    return res.status(400).json({
      success: false,
      message: "Crew ID is required",
    });
  }

  const flights = await Flights.find({
    crewIds: crewId,
  })
    .populate("aircraftId", "registrationNumber model capacity")
    .populate({
      path: "crewIds",
      select: "userId role employeeId currentStatus",
      populate: {
        path: "userId",
        select: "name email phone",
      },
    });

  res.status(200).json({
    success: true,
    count: flights.length,
    data: flights,
  });
});
