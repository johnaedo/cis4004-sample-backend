// server/middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

      const user = await User.findById(decoded.id).select("id username email");

      if (!user) {
        req.user = null;
        return next();
      }

      req.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      };
      next();
    } catch (jwtError) {
      // Covers both invalid/expired JWTs and a malformed decoded.id that
      // can't be cast to a Mongo ObjectId - either way, continue without a user
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
