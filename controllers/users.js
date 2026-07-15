// server/controllers/users.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const UsersController = {
  registerUser: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Create user
      const user = await User.create({
        username,
        email,
        password: password_hash,
      });

      // Generate JWT
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.status(201).json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === 11000) {
        // Duplicate key violation (unique index on username or email)
        res.status(400).json({ error: "Username or email already exists" });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  loginUser: async (req, res) => {
    const { identifier, password } = req.body;

    try {
      // Check if identifier is an email
      const isEmail = /\S+@\S+\.\S+/.test(identifier);
      const lookup = isEmail ? { email: identifier } : { username: identifier };

      // password has `select: false` in the schema, so it must be
      // explicitly requested here
      const user = await User.findOne(lookup).select("+password");

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { username, email, currentPassword } = req.body;
      const userId = req.user.id;

      // First verify the current password
      const user = await User.findById(userId).select("+password");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const validPassword = await bcrypt.compare(currentPassword, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update the user profile - only overwrite fields that were provided,
      // equivalent to the old SQL COALESCE(?, username)/COALESCE(?, email)
      if (username !== undefined) user.username = username;
      if (email !== undefined) user.email = email;
      await user.save();

      res.json({
        id: user._id,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.code === 11000) {
        // Duplicate key violation (unique index on username or email)
        res.status(400).json({ error: "Username or email already exists" });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select(
        "id username email createdAt"
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user._id,
        username: user.username,
        email: user.email,
        created_at: user.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

export default UsersController;
