import Users from "../models/userModel.js";
import bcrypt from "bcrypt";
import expressAsyncHandler from "express-async-handler";
import generateToken from "../utils/generateToken.js";

const registerUser = expressAsyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // check existing user
  const userExists = await Users.findOne({ email });
  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  // hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // create user
  const user = await Users.create({
    name,
    email,
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
    message: "Account Created",
  });
});

const loginUser = expressAsyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email & Password required" });
  }

  const user = await Users.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    generateToken(user._id, res);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });
  } else {
    res.status(401).json({ message: "Invalid credentials" });
  }
});

export { registerUser, loginUser };
