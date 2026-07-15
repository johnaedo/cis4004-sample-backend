import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Flatten a populated transaction doc so category fields look like the old
// SQL joined response (category_name, category_type, category_color).
function formatTransaction(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { category, ...rest } = obj;
  return {
    ...rest,
    category_id: category?._id ?? obj.category ?? null,
    category_name: category?.name ?? null,
    category_type: category?.type ?? null,
    category_color: category?.color ?? null,
  };
}

// Get all transactions for a user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const results = await Transaction.find({ user: req.user.id }).populate(
      'category',
      'name type color'
    );
    res.json(results.map(formatTransaction));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const results = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: '$type',
          total_amount: { $sum: '$amount' },
          transaction_count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          type: '$_id',
          total_amount: 1,
          transaction_count: 1,
        },
      },
    ]);

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new transaction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, description, date, type } = req.body;

    const created = await Transaction.create({
      user: req.user.id,
      category: category_id || null,
      amount,
      description,
      date,
      type,
    });

    const newTransaction = await created.populate('category', 'name type color');

    res.status(201).json(formatTransaction(newTransaction));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a transaction
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, description, date, type } = req.body;

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { category: category_id || null, amount, description, date, type },
      { new: true, runValidators: true }
    ).populate('category', 'name type color');

    if (!updatedTransaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(formatTransaction(updatedTransaction));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    }).populate('category', 'name type color');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(formatTransaction(transaction));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
