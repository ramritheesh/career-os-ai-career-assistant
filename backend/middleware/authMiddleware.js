// backend/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function authenticateToken(req, res, next) {
  try {
    if (!JWT_SECRET) {
      return res.status(500).json({
        message: "JWT_SECRET is not configured.",
      });
    }

    // -----------------------------------------------
    // Read Authorization header
    // -----------------------------------------------

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message:
          "Access denied. Authorization token is required.",
      });
    }

    // Expected:
    // Authorization: Bearer <token>

    const parts = authHeader.trim().split(/\s+/);

    if (
      parts.length !== 2 ||
      parts[0].toLowerCase() !== "bearer"
    ) {
      return res.status(401).json({
        message:
          "Invalid authorization format. Use: Bearer <token>",
      });
    }

    const token = parts[1];

    if (!token) {
      return res.status(401).json({
        message:
          "Access denied. Token is missing.",
      });
    }

    // -----------------------------------------------
    // Verify JWT
    // -----------------------------------------------

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    // Store decoded information
    // Example:
    // req.user = {
    //   userId: "...",
    //   email: "..."
    // }

    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "❌ JWT authentication error:",
      error.message
    );

    if (
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        message:
          "Token has expired. Please login again.",
      });
    }

    if (
      error.name === "JsonWebTokenError"
    ) {
      return res.status(401).json({
        message:
          "Invalid token. Please login again.",
      });
    }

    return res.status(401).json({
      message:
        "Authentication failed.",
    });
  }
}

module.exports = {
  authenticateToken,
};