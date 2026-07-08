import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all categories for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [results] = await pool.query(
      'SELECT * FROM budget_categories WHERE user_id = ? OR user_id IS NULL',
      [req.user.id]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new category
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, color } = req.body;
    const [result] = await pool.query(
      'INSERT INTO budget_categories (user_id, name, type, color) VALUES (?, ?, ?, ?)',
      [req.user.id, name, type, color]
    );
    
    const [newCategory] = await pool.query(
      'SELECT * FROM budget_categories WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newCategory[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, type, color } = req.body;
    await pool.query(
      'UPDATE budget_categories SET name = ?, type = ?, color = ? WHERE id = ? AND user_id = ?',
      [name, type, color, req.params.id, req.user.id]
    );
    
    const [updatedCategory] = await pool.query(
      'SELECT * FROM budget_categories WHERE id = ?',
      [req.params.id]
    );
    
    if (!updatedCategory.length) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(updatedCategory[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [category] = await pool.query(
      'SELECT * FROM budget_categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (!category.length) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await pool.query(
      'DELETE FROM budget_categories WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    res.json(category[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 