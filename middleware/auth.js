// server/middleware/auth.js
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // Instead of returning error, just continue without user
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      );

      const [rows] = await pool.query(
        "SELECT id, username, email FROM users WHERE id = ?",
        [decoded.id],
      );

      if (!rows || rows.length === 0) {
        req.user = null;
        return next();
      }

      req.user = rows[0];
      next();
    } catch (jwtError) {
      // If token is invalid, continue without user
      console.log("JWT verification error:", jwtError);
      req.user = null;
      next();
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    req.user = null;
    next();
  }
};

export default authenticateToken;
