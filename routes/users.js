// server/routes/users.js
import express from "express";
import UsersController from "../controllers/users.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Register user
router.post("/register", UsersController.registerUser);

// Login user
router.post("/login", UsersController.loginUser);

// Update user profile
router.put("/profile", auth, UsersController.updateProfile);

// Get user profile
router.get("/profile", auth, UsersController.getUserProfile);

export default router;
