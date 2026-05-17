import Users from "../models/userModel.js";
import bcrypt from "bcrypt";
import expressAsyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";

// ===============================
// REGISTER USER
// ===============================
const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // ===============================
  // REQUIRED FIELD VALIDATION
  // ===============================
  if (!name || !email || !phone || !password) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  // ===============================
  // NAME VALIDATION
  // ===============================
  if (name.trim().length < 3) {
    return res.status(400).json({
      message: "Name must contain at least 3 characters",
    });
  }

  // only letters and spaces
  const nameRegex = /^[A-Za-z\s]+$/;

  if (!nameRegex.test(name)) {
    return res.status(400).json({
      message: "Name can only contain letters and spaces",
    });
  }

  // ===============================
  // EMAIL VALIDATION
  // ===============================
  const emailRegex =
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  // ===============================
  // PHONE VALIDATION
  // ===============================
  // Indian phone validation
  const phoneRegex = /^[6-9]\d{9}$/;

  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      message: "Invalid phone number",
    });
  }

  // ===============================
  // PASSWORD VALIDATION
  // ===============================
  /*
    Minimum 8 characters
    At least:
    - 1 uppercase
    - 1 lowercase
    - 1 number
    - 1 special character
  */

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      message:
        "Password must contain minimum 8 characters, uppercase, lowercase, number and special character",
    });
  }

  // ===============================
  // CHECK EXISTING USER
  // ===============================
  const userExists = await Users.findOne({
    $or: [{ email }, { phone }],
  });

  if (userExists) {
    return res.status(400).json({
      message: "User already exists",
    });
  }

  // ===============================
  // HASH PASSWORD
  // ===============================
  const salt = await bcrypt.genSalt(10);

  const hashedPassword = await bcrypt.hash(password, salt);

  // ===============================
  // CREATE USER
  // ===============================
  const user = await Users.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone,
    password: hashedPassword,
    role: "passenger",
  });

  // ===============================
  // RESPONSE
  // ===============================
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    message: "Account Created Successfully",
  });
});

// ===============================
// LOGIN USER
// ===============================
const loginUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // ===============================
  // REQUIRED FIELD VALIDATION
  // ===============================
  if (!email || !password) {
    return res.status(400).json({
      message: "Email & Password required",
    });
  }

  // ===============================
  // EMAIL VALIDATION
  // ===============================
  const emailRegex =
    /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({
      message: "Invalid email format",
    });
  }

  // ===============================
  // FIND USER
  // ===============================
  const user = await Users.findOne({
    email: email.toLowerCase().trim(),
  });

  // ===============================
  // CHECK PASSWORD
  // ===============================
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
    res.status(401).json({
      message: "Invalid credentials",
    });
  }
});

export { registerUser, loginUser };