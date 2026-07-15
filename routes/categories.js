import express from "express";
import Category from "../models/Category.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Get all categories for a user (their own + global/default categories)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const results = await Category.find({
      $or: [{ user: req.user.id }, { user: null }],
    });
    console.table(results);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new category
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, type, color } = req.body;
    const newCategory = await Category.create({
      user: req.user.id,
      name,
      type,
      color,
    });

    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a category
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { name, type, color } = req.body;
    console.log("Body:");
    console.table(req.body);
    console.log("Params:");
    console.table(req.params);
    const updatedCategory = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name, type, color },
      { new: true, runValidators: true },
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a category
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
