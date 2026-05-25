import Users from "../models/userModel.js";
import bcrypt from "bcrypt";
import expressAsyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";
import Bookings from "../models/bookingModel.js";
import Flights from "../models/flightsModel.js";
import Loyalty from "../models/loyaltyModel.js";

/* -------------------------------------------------------------------------- */
/*  POST /api/users/register                                                  */
/* -------------------------------------------------------------------------- */
const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (name.trim().length < 3)
    return res
      .status(400)
      .json({ message: "Name must contain at least 3 characters" });

  if (!/^[A-Za-z\s]+$/.test(name))
    return res
      .status(400)
      .json({ message: "Name can only contain letters and spaces" });

  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
    return res.status(400).json({ message: "Invalid email format" });

  if (!/^[6-9]\d{9}$/.test(phone))
    return res.status(400).json({ message: "Invalid phone number" });

  if (
    !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
      password,
    )
  )
    return res.status(400).json({
      message:
        "Password must contain minimum 8 characters, uppercase, lowercase, number and special character",
    });

  const userExists = await Users.findOne({ $or: [{ email }, { phone }] });
  if (userExists)
    return res.status(400).json({ message: "User already exists" });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await Users.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone,
    password: hashedPassword,
    role: "passenger",
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    message: "Account Created Successfully",
  });
});

/* -------------------------------------------------------------------------- */
/*  POST /api/users/login                                                     */
/* -------------------------------------------------------------------------- */
const loginUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email & Password required" });

  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email))
    return res.status(400).json({ message: "Invalid email format" });

  const user = await Users.findOne({ email: email.toLowerCase().trim() });

  if (user && (await user.matchPassword(password))) {
    generateToken(user._id, res);
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      message: "Login Successful",
    });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

/* -------------------------------------------------------------------------- */
/*  GET /api/users/stats  (admin)                                             */
/* -------------------------------------------------------------------------- */
const getUserStats = expressAsyncHandler(async (req, res) => {
  const [total, passengers, crew, admins, newThisMonth] = await Promise.all([
    Users.countDocuments(),
    Users.countDocuments({ role: "passenger" }),
    Users.countDocuments({ role: "crew" }),
    Users.countDocuments({ role: "admin" }),
    Users.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: { total, passengers, crew, admins, newThisMonth },
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/users  (admin)                                                   */
/*  Query params: role, search, page, limit                                  */
/* -------------------------------------------------------------------------- */
const getAllUsers = expressAsyncHandler(async (req, res) => {
  const { search, page = 1, limit = 15 } = req.query;

  const query = {
    role: "passenger",
  };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Users.countDocuments(query);
  const users = await Users.find(query)
    .select("-password")
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: users,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/users/:id  (admin)                                               */
/* -------------------------------------------------------------------------- */
const getUserById = expressAsyncHandler(async (req, res) => {
  const user = await Users.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // ── BOOKINGS ─────────────────────────────
  const bookings = await Bookings.find({
    passengerId: user._id,
  })
    .populate({
      path: "flightId",
      select:
        "flightNumber source destination departureTime arrivalTime status",
    })
    .sort({ createdAt: -1 });

  // ── FLIGHTS FROM BOOKINGS ────────────────
  const flights = bookings.map((b) => b.flightId).filter(Boolean);

  // ── LOYALTY ──────────────────────────────
  let loyalty = await Loyalty.findOne({
    passengerId: user._id,
  });

  // fallback if no loyalty document
  if (!loyalty) {
    loyalty = {
      points: 0,
      tier: "silver",
      totalEarned: 0,
      totalRedeemed: 0,
      history: [],
    };
  }

  // ── STATS ────────────────────────────────
  const totalBookings = bookings.length;

  const completedTrips = bookings.filter(
    (b) => b.status === "completed",
  ).length;

  const upcomingTrips = bookings.filter(
    (b) =>
      b.status === "confirmed" &&
      ["scheduled", "boarding", "in-flight", "delayed"].includes(
        b.flightId?.status,
      ),
  ).length;

  const cancelledTrips = bookings.filter(
    (b) => b.status === "cancelled",
  ).length;

  const totalSpent = bookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  res.status(200).json({
    success: true,

    data: {
      user,

      stats: {
        totalBookings,
        completedTrips,
        upcomingTrips,
        cancelledTrips,
        totalSpent,
      },

      loyalty,

      bookings,

      flights,
    },
  });
});

/* -------------------------------------------------------------------------- */
/*  PUT /api/users/me                                                */
/*  can update name, email, phone, password                      */
/* -------------------------------------------------------------------------- */
const updateUser = expressAsyncHandler(async (req, res) => {
  const user = await Users.findById(req.user._id);

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const { name, email, phone, password } = req.body;

  /* Duplicate email check */
  if (email && email !== user.email) {
    const exists = await Users.findOne({ email: email.toLowerCase().trim() });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
  }

  /* Duplicate phone check */
  if (phone && phone !== user.phone) {
    const exists = await Users.findOne({ phone });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Phone already in use" });
  }

  user.name = name ?? user.name;
  user.email = email ? email.toLowerCase().trim() : user.email;
  user.phone = phone ?? user.phone;

  if (password && password.trim().length >= 6) {
    user.password = await bcrypt.hash(password, 10);
  }

  const updated = await user.save();

  res.status(200).json({
    success: true,
    data: {
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      createdAt: updated.createdAt,
    },
  });
});

/* -------------------------------------------------------------------------- */
/*  DELETE /api/users/:id  (admin)                                            */
/*  Prevents deleting your own account or another admin.                     */
/* -------------------------------------------------------------------------- */
const deleteUser = expressAsyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own account",
    });
  }

  const user = await Users.findById(req.params.id);

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  if (user.role === "admin") {
    return res.status(400).json({
      success: false,
      message: "Cannot delete another admin account",
    });
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: `User ${user.name} deleted successfully`,
  });
});

/* -------------------------------------------------------------------------- */
/*  GET /api/users/me  (any authenticated user)                               */
/*  Returns the logged-in user's own profile.                                */
/* -------------------------------------------------------------------------- */
const getMe = expressAsyncHandler(async (req, res) => {
  const user = await Users.findById(req.user._id).select("-password");

  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  res.status(200).json({ success: true, data: user });
});

const logoutUser = expressAsyncHandler(async (req, res) => {
  res.cookie("authToken", "", {
    httpOnly: true,
    expiresIn: new Date(0),
  });

  res.status(200).json({ message: "logout success" });
});

export {
  registerUser,
  loginUser,
  getUserStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMe,
  logoutUser,
};
