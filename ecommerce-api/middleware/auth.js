const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.header("Authorization");
  console.log("authMiddleware - Authorization header:", authHeader);
  if (!authHeader) {
    console.log("authMiddleware - No token provided");
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.replace("Bearer ", "");
  console.log("authMiddleware - Token:", token);
  if (!token) {
    console.log("authMiddleware - Invalid token format");
    return res.status(401).json({ message: "Invalid token format" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("authMiddleware - Decoded token:", decoded);
    const user = await User.findById(decoded.userId).select("_id email role");
    console.log("authMiddleware - User query result:", user);
    if (!user) {
      console.log("authMiddleware - User not found for ID:", decoded.userId);
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    console.log("authMiddleware - User authenticated:", user._id, user.email);
    next();
  } catch (error) {
    console.error("authMiddleware - Error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
