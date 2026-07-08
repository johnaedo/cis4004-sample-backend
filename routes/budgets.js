import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all budgets for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [results] = await pool.query(
      `SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM budgets b 
       LEFT JOIN budget_categories c ON b.category_id = c.id 
       WHERE b.user_id = ?`,
      [req.user.id]
    );
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get budgets and actual spending for the period
    const [results] = await pool.query(
      `SELECT 
         c.id as category_id,
         c.name as category_name,
         c.type as category_type,
         c.color as category_color,
         b.amount as budget_amount,
         COALESCE(SUM(t.amount), 0) as spent_amount,
         b.id
       FROM budget_categories c
       LEFT JOIN budgets b ON c.id = b.category_id 
         AND b.user_id = ?
         AND b.start_date <= ? 
         AND b.end_date >= ?
       LEFT JOIN transactions t ON c.id = t.category_id
         AND t.user_id = ?
         AND t.date BETWEEN ? AND ?
       WHERE (c.user_id = ? OR c.user_id IS NULL)
       GROUP BY c.id, c.name, c.type, c.color, b.amount, b.id
       HAVING budget_amount IS NOT NULL`,
      [req.user.id, endDate, startDate, req.user.id, startDate, endDate, req.user.id]
    );

    // Calculate status for each budget
    const budgetsWithStatus = results.map(budget => ({
      ...budget,
      status: budget.spent_amount > budget.budget_amount ? 'over' :
              budget.spent_amount > budget.budget_amount * 0.9 ? 'warning' :
              'healthy'
    }));

    res.json(budgetsWithStatus);
  } catch (error) {
    console.error('Budget summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new budget
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, start_date, end_date } = req.body;
    const [result] = await pool.query(
      'INSERT INTO budgets (user_id, category_id, amount, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, category_id, amount, start_date, end_date]
    );
    
    const [newBudget] = await pool.query(
      `SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM budgets b 
       LEFT JOIN budget_categories c ON b.category_id = c.id 
       WHERE b.id = ?`,
      [result.insertId]
    );
    
    res.status(201).json(newBudget[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a budget
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, start_date, end_date } = req.body;
    await pool.query(
      'UPDATE budgets SET category_id = ?, amount = ?, start_date = ?, end_date = ? WHERE id = ? AND user_id = ?',
      [category_id, amount, start_date, end_date, req.params.id, req.user.id]
    );
    
    const [updatedBudget] = await pool.query(
      `SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM budgets b 
       LEFT JOIN budget_categories c ON b.category_id = c.id 
       WHERE b.id = ?`,
      [req.params.id]
    );
    
    if (!updatedBudget.length) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    res.json(updatedBudget[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a budget
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const [budget] = await pool.query(
      `SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM budgets b 
       LEFT JOIN budget_categories c ON b.category_id = c.id 
       WHERE b.id = ? AND b.user_id = ?`,
      [req.params.id, req.user.id]
    );
    
    if (!budget.length) {
      return res.status(404).json({ error: "Budget not found" });
    }
    
    await pool.query(
      'DELETE FROM budgets WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    res.json(budget[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions for a specific budget period
router.get('/:id/transactions', authenticateToken, async (req, res) => {
  try {
    // First get the budget details
    const [budget] = await pool.query(
      `SELECT b.*, c.name as category_name, c.type as category_type, c.color as category_color 
       FROM budgets b 
       LEFT JOIN budget_categories c ON b.category_id = c.id 
       WHERE b.id = ? AND b.user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (!budget.length) {
      return res.status(404).json({ error: "Budget not found" });
    }

    // Get transactions for the budget period
    const [transactions] = await pool.query(
      `SELECT 
         t.date as transaction_date,
         SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
         SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expenses
       FROM transactions t
       WHERE t.user_id = ?
         AND t.date BETWEEN ? AND ?
       GROUP BY t.date
       ORDER BY t.date ASC`,
      [req.user.id, budget[0].start_date, budget[0].end_date]
    );

    // Calculate savings for each day
    const dailyData = transactions.map(day => ({
      month: day.transaction_date,
      income: parseFloat(day.income) || 0,
      expenses: parseFloat(day.expenses) || 0,
      savings: (parseFloat(day.income) || 0) - (parseFloat(day.expenses) || 0)
    }));

    res.json({
      budget: budget[0],
      transactions: dailyData
    });
  } catch (error) {
    console.error('Budget transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 