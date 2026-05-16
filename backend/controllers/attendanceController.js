// controllers/attendanceController.js
import Attendance from "../models/attendanceModel.js";
import expressAsyncHandler from "express-async-handler";
import Crews from "../models/crewModel.js";

// ── @desc    Get today's attendance for logged-in crew
// ── @route   GET /api/attendance/today
// ── @access  Crew
export const getTodayAttendance = expressAsyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.findOne({
    staffId: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  });

  res.status(200).json({ success: true, data: attendance ?? null });
});

// ── @desc    Get attendance history for logged-in crew
// ── @route   GET /api/attendance/my
// ── @access  Crew
export const getMyAttendance = expressAsyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;

  const total = await Attendance.countDocuments({ staffId: req.user._id });
  const records = await Attendance.find({ staffId: req.user._id })
    .sort({ date: -1 })
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

// ── @desc    Punch in
// ── @route   POST /api/attendance/punch-in
// ── @access  Crew
export const punchIn = expressAsyncHandler(async (req, res) => {
  const now = new Date();

  // IST date
  const istDate = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  const today = new Date(
    istDate.getFullYear(),
    istDate.getMonth(),
    istDate.getDate(),
  );

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // check already punched in
  const existing = await Attendance.findOne({
    staffId: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  });

  if (existing) {
    if (existing.clockIn) {
      return res.status(400).json({
        success: false,
        message: "Already punched in today",
      });
    }
  }

  if (existing) {
    existing.clockIn = now;
    existing.status = "present";
    existing.biometricVerified = true;

    await existing.save();

    return res.status(200).json({
      success: true,
      data: existing,
    });
  }

  const crew = await Crews.findOne({ userId: req.user._id });

  crew.currentStatus = "On Duty";

  await crew.save();

  const attendance = await Attendance.create({
    staffId: req.user._id,
    date: today,
    clockIn: now,
    status: "present",
    biometricVerified: true,
  });

  res.status(201).json({
    success: true,
    data: attendance,
  });
});

// ── @desc    Punch out
// ── @route   PATCH /api/attendance/punch-out
// ── @access  Crew
export const punchOut = expressAsyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const attendance = await Attendance.findOne({
    staffId: req.user._id,
    date: { $gte: today, $lt: tomorrow },
  });

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "No punch-in found for today. Please punch in first.",
    });
  }

  if (!attendance.clockIn) {
    return res.status(400).json({
      success: false,
      message: "You have not punched in yet today.",
    });
  }

  if (attendance.clockOut) {
    return res.status(400).json({
      success: false,
      message: "Already punched out today.",
    });
  }

  const crew = await Crews.findOne({ userId: req.user._id });

  crew.currentStatus = "Off Duty";

  await crew.save();

  const now = new Date();
  const hoursOnDuty = (now - attendance.clockIn) / (1000 * 60 * 60);

  attendance.clockOut = now;
  attendance.status = hoursOnDuty < 4 ? "half-day" : "present";
  await attendance.save();

  res.status(200).json({ success: true, data: attendance });
});

// ── @desc    Get all attendance (admin)
// ── @route   GET /api/attendance
// ── @access  Admin
export const getAllAttendance = expressAsyncHandler(async (req, res) => {
  const { staffId, date, status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (staffId) query.staffId = staffId;
  if (status) query.status = status;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    query.date = { $gte: d, $lt: next };
  }

  const total = await Attendance.countDocuments(query);
  const records = await Attendance.find(query)
    .populate("staffId", "name email role")
    .sort({ date: -1 })
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

// ── @desc    Get crew's own attendance by month
// ── @route   GET /api/attendance/my/month?year=&month=
// ── @access  Crew
export const getMyAttendanceByMonth = expressAsyncHandler(async (req, res) => {
  const { year, month } = req.query;

  const y = Number(year) || new Date().getFullYear();
  const m = Number(month) || new Date().getMonth() + 1; // 1-12

  const start = new Date(y, m - 1, 1); // first day of month
  const end = new Date(y, m, 1); // first day of next month

  const records = await Attendance.find({
    staffId: req.user._id,
    date: { $gte: start, $lt: end },
  }).sort({ date: 1 });

  res.status(200).json({ success: true, data: records });
});
