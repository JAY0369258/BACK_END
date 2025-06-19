const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/auth");

// Register
router.post("/register", async (req, res) => {
  try {
    console.log("POST /auth/register - Request body:", req.body);
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      console.log("POST /auth/register - Missing required fields");
      return res
        .status(400)
        .json({ message: "All fields (name, email, password) are required" });
    }

    // Validate email must be @gmail.com
    if (!email.endsWith("@gmail.com")) {
      console.log("POST /auth/register - Invalid email domain:", email);
      return res
        .status(400)
        .json({ message: "Only @gmail.com emails are allowed" });
    }

    // Validate password (at least 6 characters, contains letters and numbers)
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password)) {
      console.log("POST /auth/register - Invalid password:", password);
      return res
        .status(400)
        .json({
          message:
            "Password must be at least 6 characters and contain both letters and numbers",
        });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("POST /auth/register - Email already exists:", email);
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: "user", // Mặc định role là 'user'
    });
    await user.save();
    console.log("POST /auth/register - User saved:", user);
    res.status(201).json({ message: "Registered successfully" });
  } catch (error) {
    console.error("POST /auth/register - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    console.log("POST /auth/login - Request body:", req.body);
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      console.log("POST /auth/login - User not found:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("POST /auth/login - Password mismatch for:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    console.log(
      "POST /auth/login - Token generated for:",
      email,
      "Role:",
      user.role
    );
    res.json({ token, role: user.role });
  } catch (error) {
    console.error("POST /auth/login - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    console.log("GET /auth/me - User ID:", req.user._id);
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      console.log("GET /auth/me - User not found");
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("GET /auth/me - Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Logout (optional)
router.post("/logout", (req, res) => {
  console.log("POST /auth/logout");
  res.json({ message: "Logged out successfully" });
});

module.exports = router;
