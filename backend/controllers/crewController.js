// controllers/crewController.js
import Crews from "../models/crewModel.js";
import Users from "../models/userModel.js";
import bcrypt from "bcrypt";
import expressAsyncHandler from "express-async-handler";

// ── @desc    Get all crew with populated user data
// ── @route   GET /api/crew
// ── @access  Admin
export const getAllCrew = expressAsyncHandler(async (req, res) => {
  const {
    role,
    currentStatus,
    medicalStatus,
    search,
    page  = 1,
    limit = 10,
  } = req.query;

  const crewQuery = {};
  if (role          && role          !== "all") crewQuery.role          = role;
  if (currentStatus && currentStatus !== "all") crewQuery.currentStatus = currentStatus;
  if (medicalStatus && medicalStatus !== "all") crewQuery.medicalStatus = medicalStatus;

  if (search) {
    const matchingUsers = await Users.find({
      role: "crew",
      $or: [
        { name:  { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ],
    }).select("_id");

    crewQuery.userId = { $in: matchingUsers.map((u) => u._id) };
  }

  const total = await Crews.countDocuments(crewQuery);
  const crew  = await Crews.find(crewQuery)
    .populate("userId", "name email phone role")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success:    true,
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data:       crew,
  });
});

// ── @desc    Get single crew member
// ── @route   GET /api/crew/:id
// ── @access  Admin
export const getCrewById = expressAsyncHandler(async (req, res) => {
  const crew = await Crews.findOne({userId : req.params.id})
    .populate("userId", "name email phone role");

  if (!crew) {
    return res.status(404).json({ success: false, message: "Crew member not found" });
  }

  res.status(200).json({ success: true, data: crew });
});

// ── @desc    Get crew stats
// ── @route   GET /api/crew/stats
// ── @access  Admin
export const getCrewStats = expressAsyncHandler(async (req, res) => {
  const [
    total, available, onDuty, offDuty, onLeave,
    fit, underTreatment,
    pilots, coPilots, cabinCrew, groundStaff,
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
      status:  { available, onDuty, offDuty, onLeave },
      medical: { fit, underTreatment },
      roles:   { pilots, coPilots, cabinCrew, groundStaff },
    },
  });
});

// ── @desc    Create crew member (creates User + Crew, manual rollback)
// ── @route   POST /api/crew
// ── @access  Admin
export const createCrew = expressAsyncHandler(async (req, res) => {
  let createdUser = null;

  const {
    name, email, phone, password,
    employeeId, role, experience, licenseNumber, licenseExpiry,
    nationality, dateOfBirth, currentStatus, salary,
    medicalStatus, medicalLastChecked, medicalNextDue,
  } = req.body;

  // ── Required field validation ──
  if (!name || !email || !phone || !password || !employeeId || !role) {
    return res.status(400).json({
      success: false,
      message: "name, email, phone, password, employeeId and role are required",
    });
  }

  // ── Duplicate checks ──
  const [emailExists, employeeIdExists] = await Promise.all([
    Users.findOne({ email }),
    Crews.findOne({ employeeId }),
  ]);

  if (emailExists) {
    return res.status(400).json({ success: false, message: "Email already registered" });
  }

  if (employeeIdExists) {
    return res.status(400).json({
      success: false,
      message: `Employee ID ${employeeId} already exists`,
    });
  }

  try {
    // ── Create User ──
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(email)

    createdUser = await Users.create({
      name, email, phone,
      password: hashedPassword,
      role: "crew",
    });

    // ── Create Crew profile ──
    const crew = await Crews.create({
      userId:             createdUser._id,
      employeeId,
      role,
      experience:         experience         || 0,
      licenseNumber:      licenseNumber      || null,
      licenseExpiry:      licenseExpiry      || null,
      nationality:        nationality        || null,
      dateOfBirth:        dateOfBirth        || null,
      currentStatus:      currentStatus      || "Available",
      salary:             salary             || null,
      medicalStatus:      medicalStatus      || "Fit",
      medicalLastChecked: medicalLastChecked || null,
      medicalNextDue:     medicalNextDue     || null,
    });


    const populated = await crew.populate("userId", "name email phone role");


    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    // ── Manual rollback: delete user if crew creation failed ──
    if (createdUser) {
      await Users.findByIdAndDelete(createdUser._id).catch(() => {});
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── @desc    Update crew member (updates both User + Crew)
// ── @route   PUT /api/crew/:id
// ── @access  Admin
export const updateCrew = expressAsyncHandler(async (req, res) => {
  const crew = await Crews.findById(req.params.id);
  if (!crew) {
    return res.status(404).json({ success: false, message: "Crew member not found" });
  }

  const user = await Users.findById(crew.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "Associated user not found" });
  }

  const {
    name, email, phone, password,
    employeeId, role, experience, licenseNumber, licenseExpiry,
    nationality, dateOfBirth, currentStatus, salary,
    medicalStatus, medicalLastChecked, medicalNextDue,
  } = req.body;

  // ── Duplicate checks only if values are changing ──
  if (email && email !== user.email) {
    const emailExists = await Users.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }
  }

  if (employeeId && employeeId !== crew.employeeId) {
    const empExists = await Crews.findOne({ employeeId });
    if (empExists) {
      return res.status(400).json({
        success: false,
        message: `Employee ID ${employeeId} already exists`,
      });
    }
  }

  // ── Update User ──
  user.name  = name  ?? user.name;
  user.email = email ?? user.email;
  user.phone = phone ?? user.phone;
  if (password && password.trim().length >= 6) {
    user.password = await bcrypt.hash(password, 10);
  }
  await user.save();

  // ── Update Crew ──
  crew.employeeId         = employeeId         ?? crew.employeeId;
  crew.role               = role               ?? crew.role;
  crew.experience         = experience         ?? crew.experience;
  crew.licenseNumber      = licenseNumber      ?? crew.licenseNumber;
  crew.licenseExpiry      = licenseExpiry      ?? crew.licenseExpiry;
  crew.nationality        = nationality        ?? crew.nationality;
  crew.dateOfBirth        = dateOfBirth        ?? crew.dateOfBirth;
  crew.currentStatus      = currentStatus      ?? crew.currentStatus;
  crew.salary             = salary             ?? crew.salary;
  crew.medicalStatus      = medicalStatus      ?? crew.medicalStatus;
  crew.medicalLastChecked = medicalLastChecked ?? crew.medicalLastChecked;
  crew.medicalNextDue     = medicalNextDue     ?? crew.medicalNextDue;

  const updated   = await crew.save();
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
    { new: true }
  ).populate("userId", "name email phone role");

  if (!crew) {
    return res.status(404).json({ success: false, message: "Crew member not found" });
  }

  res.status(200).json({ success: true, data: crew });
});

// ── @desc    Delete crew member (deletes both User + Crew)
// ── @route   DELETE /api/crew/:id
// ── @access  Admin
export const deleteCrew = expressAsyncHandler(async (req, res) => {
  const crew = await Crews.findById(req.params.id);
  if (!crew) {
    return res.status(404).json({ success: false, message: "Crew member not found" });
  }

  if (crew.currentStatus === "On Duty") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete a crew member who is currently on duty",
    });
  }

  await Promise.all([
    crew.deleteOne(),
    Users.findByIdAndDelete(crew.userId),
  ]);

  res.status(200).json({ success: true, message: "Crew member deleted successfully" });
});