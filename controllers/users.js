// server/controllers/users.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";

const UsersController = {
  registerUser: async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Create user
      const [userResult] = await pool.query(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        [username, email, password_hash]
      );

      // Get the created user
      const [user] = await pool.query(
        "SELECT id, username, email FROM users WHERE id = ?",
        [userResult.insertId]
      );

      // Generate JWT
      const token = jwt.sign(
        { id: userResult.insertId },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.status(201).json({
        user: user[0],
        token,
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === "ER_DUP_ENTRY") {
        // Unique violation
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
      let userQuery, userParams;

      if (isEmail) {
        userQuery = "SELECT * FROM users WHERE email = ?";
        userParams = [identifier];
      } else {
        userQuery = "SELECT * FROM users WHERE username = ?";
        userParams = [identifier];
      }

      const [results] = await pool.query(userQuery, userParams);

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = results[0];
      const validPassword = await bcrypt.compare(password, user.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({
        user: {
          id: user.id,
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
      const [userResult] = await pool.query(
        "SELECT password_hash FROM users WHERE id = ?",
        [userId]
      );

      if (!userResult.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const validPassword = await bcrypt.compare(
        currentPassword,
        userResult[0].password_hash
      );

      if (!validPassword) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update the user profile
      await pool.query(
        `UPDATE users 
            SET username = COALESCE(?, username),
                email = COALESCE(?, email)
            WHERE id = ?`,
        [username, email, userId]
      );

      // Get updated user
      const [updatedUser] = await pool.query(
        "SELECT id, username, email FROM users WHERE id = ?",
        [userId]
      );

      res.json(updatedUser[0]);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.code === "ER_DUP_ENTRY") {
        // Unique violation
        res.status(400).json({ error: "Username or email already exists" });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const [results] = await pool.query(
        "SELECT id, username, email, created_at FROM users WHERE id = ?",
        [req.user.id]
      );
      res.json(results[0]);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

export default UsersController;
