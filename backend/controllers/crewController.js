// controllers/crewController.js
import Crews from "../models/crewModel.js";
import Users from "../models/userModel.js";
import Attendance from "../models/attendanceModel.js";
import Flights from "../models/flightsModel.js";
import bcrypt from "bcrypt";
import expressAsyncHandler from "express-async-handler";

// ── @desc    Get the logged-in crew member's own profile
// ── @route   GET /api/crew/me
// ── @access  Crew
export const getMyCrewProfile = expressAsyncHandler(async (req, res) => {
  const crew = await Crews.findOne({ userId: req.user._id }).populate(
    "userId",
    "name email phone role",
  );

  if (!crew) {
    return res.status(404).json({
      success: false,
      message: "Crew profile not found for this user",
    });
  }

  res.status(200).json({ success: true, data: crew });
});

// ── @desc    Get all crew with populated user data
// ── @route   GET /api/crew
// ── @access  Admin
export const getAllCrew = expressAsyncHandler(async (req, res) => {
  const {
    role,
    currentStatus,
    medicalStatus,
    search,
    page = 1,
    limit = 10,
  } = req.query;

  const crewQuery = {};
  if (role && role !== "all") crewQuery.role = role;
  if (currentStatus && currentStatus !== "all")
    crewQuery.currentStatus = currentStatus;
  if (medicalStatus && medicalStatus !== "all")
    crewQuery.medicalStatus = medicalStatus;

  if (search) {
    const matchingUsers = await Users.find({
      role: "crew",
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    crewQuery.userId = { $in: matchingUsers.map((u) => u._id) };
  }

  const total = await Crews.countDocuments(crewQuery);
  const crew = await Crews.find(crewQuery)
    .populate("userId", "name email phone role")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: crew,
  });
});

// ── @desc    Get full crew profile by User _id
// ── @route   GET /api/crew/by-user/:userId
// ── @access  Crew / Admin
export const getCrewByUserId = expressAsyncHandler(async (req, res) => {
  const { userId } = req.params;

  // ── Fix: find crew where userId field === userId param ──
  // Crews.findById(userId) was looking up crew by crew._id
  // but userId param is the user's _id, not the crew doc's _id
  const crew = await Crews.findById(userId).populate(
    "userId",
    "name email phone role createdAt",
  );

  if (!crew) {
    return res
      .status(404)
      .json({ success: false, message: "Crew profile not found" });
  }

  const crewId = crew._id;
  const now = new Date();

  const [allAttendance, allFlights, medicalRecords] = await Promise.all([
    // ── staffId is the user _id ────────────────────────
    Attendance.find({ staffId: crew.userId }).sort({ date: -1 }).lean(), // flightId removed from model — no populate

    Flights.find({ crewIds: crewId })
      .populate("aircraftId", "registrationNumber model capacity")
      .populate({
        path: "crewIds",
        select: "userId role employeeId currentStatus",
        populate: { path: "userId", select: "name email phone" },
      })
      .sort({ departureTime: -1 })
      .lean(),

    (await import("../models/medicalRecord.js")).default
      .find({ reportedBy: crew.userId })
      .populate("flightId", "flightNumber source destination departureTime")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // ── Attendance analytics ───────────────────────────
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthAttendance = allAttendance.filter(
    (a) => new Date(a.date) >= thisMonthStart,
  );

  const totalHoursWorked = allAttendance.reduce((sum, a) => {
    if (a.clockIn && a.clockOut)
      return sum + (new Date(a.clockOut) - new Date(a.clockIn)) / 3600000;
    return sum;
  }, 0);

  const monthHoursWorked = thisMonthAttendance.reduce((sum, a) => {
    if (a.clockIn && a.clockOut)
      return sum + (new Date(a.clockOut) - new Date(a.clockIn)) / 3600000;
    return sum;
  }, 0);

  const attendanceBreakdown = allAttendance.reduce(
    (acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0, "half-day": 0 },
  );

  const totalRecords = allAttendance.length;
  const attendedDays =
    (attendanceBreakdown.present || 0) + (attendanceBreakdown["half-day"] || 0);
  const attendanceRate =
    totalRecords > 0 ? Math.round((attendedDays / totalRecords) * 100) : 0;

  const todayStr = now.toISOString().slice(0, 10);
  const todayRecord =
    allAttendance.find(
      (a) => new Date(a.date).toISOString().slice(0, 10) === todayStr,
    ) ?? null;

  const isPunchedIn = !!(todayRecord?.clockIn && !todayRecord?.clockOut);

  // ── Flight analytics ───────────────────────────────
  const flightBreakdown = allFlights.reduce(
    (acc, f) => {
      acc[f.status] = (acc[f.status] || 0) + 1;
      return acc;
    },
    {
      scheduled: 0,
      boarding: 0,
      "in-flight": 0,
      delayed: 0,
      completed: 0,
      cancelled: 0,
    },
  );

  const activeFlights = allFlights.filter((f) =>
    ["boarding", "in-flight"].includes(f.status),
  );
  const upcomingFlights = allFlights.filter(
    (f) =>
      ["scheduled", "delayed"].includes(f.status) &&
      new Date(f.departureTime) > now,
  );
  const completedFlights = allFlights.filter((f) => f.status === "completed");

  const totalFlightHours = completedFlights.reduce((sum, f) => {
    if (f.departureTime && f.arrivalTime)
      return (
        sum + (new Date(f.arrivalTime) - new Date(f.departureTime)) / 3600000
      );
    return sum;
  }, 0);

  const lastFlight = completedFlights[0] ?? null;
  const nextFlight =
    [...upcomingFlights].sort(
      (a, b) => new Date(a.departureTime) - new Date(b.departureTime),
    )[0] ?? null;

  const licenseExpiringSoon =
    crew.licenseExpiry &&
    new Date(crew.licenseExpiry) <
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const medicalDueSoon =
    crew.medicalNextDue &&
    new Date(crew.medicalNextDue) <
      new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  res.status(200).json({
    success: true,
    data: {
      profile: {
        _id: crew._id,
        employeeId: crew.employeeId,
        role: crew.role,
        experience: crew.experience,
        licenseNumber: crew.licenseNumber,
        licenseExpiry: crew.licenseExpiry,
        licenseExpiringSoon,
        nationality: crew.nationality,
        dateOfBirth: crew.dateOfBirth,
        currentStatus: crew.currentStatus,
        salary: crew.salary,
        medicalStatus: crew.medicalStatus,
        medicalLastChecked: crew.medicalLastChecked,
        medicalNextDue: crew.medicalNextDue,
        medicalDueSoon,
        createdAt: crew.createdAt,
        userId: crew.userId,
      },
      attendance: {
        records: allAttendance,
        todayRecord,
        isPunchedIn,
        breakdown: attendanceBreakdown,
        totalRecords,
        attendanceRate,
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
        monthHoursWorked: Math.round(monthHoursWorked * 10) / 10,
        thisMonthRecords: thisMonthAttendance,
      },
      flights: {
        all: allFlights,
        active: activeFlights,
        upcoming: upcomingFlights,
        completed: completedFlights,
        breakdown: flightBreakdown,
        totalCount: allFlights.length,
        totalFlightHours: Math.round(totalFlightHours * 10) / 10,
        lastFlight,
        nextFlight,
      },
      medicalRecords: {
        records: medicalRecords,
        total: medicalRecords.length,
        open: medicalRecords.filter((r) => r.status === "open").length,
        resolved: medicalRecords.filter((r) => r.status === "resolved").length,
      },
      summary: {
        totalFlights: allFlights.length,
        completedFlights: completedFlights.length,
        attendanceRate,
        totalFlightHours: Math.round(totalFlightHours * 10) / 10,
        totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
        currentStatus: crew.currentStatus,
        medicalStatus: crew.medicalStatus,
        licenseExpiringSoon,
        medicalDueSoon,
        isPunchedIn,
        activeFlightCount: activeFlights.length,
        upcomingFlightCount: upcomingFlights.length,
      },
    },
  });
});

// ── @desc    Get crew stats
// ── @route   GET /api/crew/stats
// ── @access  Admin
export const getCrewStats = expressAsyncHandler(async (req, res) => {
  const [
    total,
    available,
    onDuty,
    offDuty,
    onLeave,
    fit,
    underTreatment,
    pilots,
    coPilots,
    cabinCrew,
    groundStaff,
  ] = await Promise.all([
    Crews.countDocuments(),
    Crews.countDocuments({ currentStatus: "Available" }),
    Crews.countDocuments({ currentStatus: "On Duty" }),
    Crews.countDocuments({ currentStatus: "Off Duty" }),
    Crews.countDocuments({ currentStatus: "On Leave" }),
    Crews.countDocuments({ medicalStatus: "Fit" }),
    Crews.countDocuments({ medicalStatus: "Under Treatment" }),
    Crews.countDocuments({ role: "Pilot" }),
    Crews.countDocuments({ role: "Co-Pilot" }),
    Crews.countDocuments({ role: "Cabin Crew" }),
    Crews.countDocuments({ role: "Ground Staff" }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      available,
      onDuty,
      offDuty,
      onLeave,
      medical: { fit, underTreatment },
      roles: { pilots, coPilots, cabinCrew, groundStaff },
    },
  });
});

// ── @desc    Create crew member (creates User + Crew, manual rollback)
// ── @route   POST /api/crew
// ── @access  Admin
export const createCrew = expressAsyncHandler(async (req, res) => {
  let createdUser = null;

  const {
    name,
    email,
    phone,
    password,
    employeeId,
    role,
    experience,
    licenseNumber,
    licenseExpiry,
    nationality,
    dateOfBirth,
    currentStatus,
    salary,
    medicalStatus,
    medicalLastChecked,
    medicalNextDue,
  } = req.body;

  if (!name || !email || !phone || !password || !employeeId || !role) {
    return res.status(400).json({
      success: false,
      message: "name, email, phone, password, employeeId and role are required",
    });
  }

  const [emailExists, employeeIdExists] = await Promise.all([
    Users.findOne({ email }),
    Crews.findOne({ employeeId }),
  ]);

  if (emailExists)
    return res
      .status(400)
      .json({ success: false, message: "Email already registered" });
  if (employeeIdExists)
    return res.status(400).json({
      success: false,
      message: `Employee ID ${employeeId} already exists`,
    });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    createdUser = await Users.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "crew",
    });

    const crew = await Crews.create({
      userId: createdUser._id,
      employeeId,
      role,
      experience: experience || 0,
      licenseNumber: licenseNumber || null,
      licenseExpiry: licenseExpiry || null,
      nationality: nationality || null,
      dateOfBirth: dateOfBirth || null,
      currentStatus: currentStatus || "Available",
      salary: salary || null,
      medicalStatus: medicalStatus || "Fit",
      medicalLastChecked: medicalLastChecked || null,
      medicalNextDue: medicalNextDue || null,
    });

    const populated = await crew.populate("userId", "name email phone role");
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    if (createdUser)
      await Users.findByIdAndDelete(createdUser._id).catch(() => {});
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── @desc    Update crew member
// ── @route   PUT /api/crew/:id
// ── @access  Admin
export const updateCrew = expressAsyncHandler(async (req, res) => {
  const crew = await Crews.findById(req.params.id);
  if (!crew)
    return res
      .status(404)
      .json({ success: false, message: "Crew member not found" });

  const user = await Users.findById(crew.userId);
  if (!user)
    return res
      .status(404)
      .json({ success: false, message: "Associated user not found" });

  const {
    name,
    email,
    phone,
    password,
    employeeId,
    role,
    experience,
    licenseNumber,
    licenseExpiry,
    nationality,
    dateOfBirth,
    currentStatus,
    salary,
    medicalStatus,
    medicalLastChecked,
    medicalNextDue,
  } = req.body;

  if (email && email !== user.email) {
    const emailExists = await Users.findOne({ email });
    if (emailExists)
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
  }

  if (employeeId && employeeId !== crew.employeeId) {
    const empExists = await Crews.findOne({ employeeId });
    if (empExists)
      return res.status(400).json({
        success: false,
        message: `Employee ID ${employeeId} already exists`,
      });
  }

  user.name = name ?? user.name;
  user.email = email ?? user.email;
  user.phone = phone ?? user.phone;
  if (password && password.trim().length >= 6) {
    user.password = await bcrypt.hash(password, 10);
  }
  await user.save();

  crew.employeeId = employeeId ?? crew.employeeId;
  crew.role = role ?? crew.role;
  crew.experience = experience ?? crew.experience;
  crew.licenseNumber = licenseNumber ?? crew.licenseNumber;
  crew.licenseExpiry = licenseExpiry ?? crew.licenseExpiry;
  crew.nationality = nationality ?? crew.nationality;
  crew.dateOfBirth = dateOfBirth ?? crew.dateOfBirth;
  crew.currentStatus = currentStatus ?? crew.currentStatus;
  crew.salary = salary ?? crew.salary;
  crew.medicalStatus = medicalStatus ?? crew.medicalStatus;
  crew.medicalLastChecked = medicalLastChecked ?? crew.medicalLastChecked;
  crew.medicalNextDue = medicalNextDue ?? crew.medicalNextDue;

  const updated = await crew.save();
  const populated = await updated.populate("userId", "name email phone role");
  res.status(200).json({ success: true, data: populated });
});

// ── @desc    Update crew status only
// ── @route   PATCH /api/crew/:id/status
// ── @access  Admin
export const updateCrewStatus = expressAsyncHandler(async (req, res) => {
  const { currentStatus } = req.body;
  const allowed = ["Available", "On Duty", "Off Duty", "On Leave"];

  if (!allowed.includes(currentStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${allowed.join(", ")}`,
    });
  }

  const crew = await Crews.findByIdAndUpdate(
    req.params.id,
    { currentStatus },
    { new: true },
  ).populate("userId", "name email phone role");

  if (!crew)
    return res
      .status(404)
      .json({ success: false, message: "Crew member not found" });

  res.status(200).json({ success: true, data: crew });
});

// ── @desc    Delete crew member (deletes both User + Crew)
// ── @route   DELETE /api/crew/:id
// ── @access  Admin
export const deleteCrew = expressAsyncHandler(async (req, res) => {
  const crew = await Crews.findById(req.params.id);
  if (!crew)
    return res
      .status(404)
      .json({ success: false, message: "Crew member not found" });

  if (crew.currentStatus === "On Duty") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete a crew member who is currently on duty",
    });
  }

  await Promise.all([crew.deleteOne(), Users.findByIdAndDelete(crew.userId)]);
  res
    .status(200)
    .json({ success: true, message: "Crew member deleted successfully" });
});
