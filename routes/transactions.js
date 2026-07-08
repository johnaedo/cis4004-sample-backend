import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM transactions t 
       LEFT JOIN budget_categories c ON t.category_id = c.id 
       WHERE t.user_id = ?`,
      [req.user.id]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const [results] = await pool.query(
      `SELECT 
         t.type,
         SUM(t.amount) as total_amount,
         COUNT(*) as transaction_count
       FROM transactions t
       LEFT JOIN budget_categories c ON t.category_id = c.id
       WHERE t.user_id = ? 
         AND t.date BETWEEN ? AND ?
       GROUP BY t.type`,
      [req.user.id, startDate, endDate]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, description, date, type } = req.body;
    const [result] = await pool.query(
      'INSERT INTO transactions (user_id, category_id, amount, description, date, type) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, category_id, amount, description, date, type]
    );
    
    const [newTransaction] = await pool.query(
      `SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM transactions t 
       LEFT JOIN budget_categories c ON t.category_id = c.id 
       WHERE t.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(newTransaction[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, description, date, type } = req.body;
    await pool.query(
      'UPDATE transactions SET category_id = ?, amount = ?, description = ?, date = ?, type = ? WHERE id = ? AND user_id = ?',
      [category_id, amount, description, date, type, req.params.id, req.user.id]
    );
    
    const [updatedTransaction] = await pool.query(
      `SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM transactions t 
       LEFT JOIN budget_categories c ON t.category_id = c.id 
       WHERE t.id = ?`,
      [req.params.id]
    );
    
    if (!updatedTransaction.length) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    res.json(updatedTransaction[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [transaction] = await pool.query(
      `SELECT t.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM transactions t 
       LEFT JOIN budget_categories c ON t.category_id = c.id 
       WHERE t.id = ? AND t.user_id = ?`,
      [req.params.id, req.user.id]
    );
    
    if (!transaction.length) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    
    await pool.query(
      'DELETE FROM transactions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    res.json(transaction[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 