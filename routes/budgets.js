import express from "express";
import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Flatten a populated budget doc so category fields look like the old
// SQL joined response (category_name, category_type, category_color).
function formatBudget(doc) {
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

// Get all budgets for a user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const results = await Budget.find({ user: req.user.id }).populate(
      "category",
      "name type color",
    );
    res.json(results.map(formatBudget));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get budget summary
router.get("/summary", authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // Find budgets active in the period, join their category, and sum
    // transactions for that category/user/date-range (mirrors the old
    // LEFT JOIN budget_categories -> budgets -> transactions query, but
    // starts from budgets since HAVING budget_amount IS NOT NULL meant
    // only budgeted categories were ever returned).
    const results = await Budget.aggregate([
      {
        $match: {
          user: userId,
          startDate: { $lte: end },
          endDate: { $gte: start },
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      {
        $lookup: {
          from: "transactions",
          let: { categoryId: "$category._id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$category", "$$categoryId"] },
                    { $eq: ["$user", userId] },
                    { $gte: ["$date", start] },
                    { $lte: ["$date", end] },
                  ],
                },
              },
            },
          ],
          as: "matchingTransactions",
        },
      },
      {
        $addFields: {
          spent_amount: { $sum: "$matchingTransactions.amount" },
        },
      },
      {
        $project: {
          _id: 1,
          category_id: "$category._id",
          category_name: "$category.name",
          category_type: "$category.type",
          category_color: "$category.color",
          budget_amount: "$amount",
          spent_amount: 1,
        },
      },
    ]);

    // Calculate status for each budget
    const budgetsWithStatus = results.map((budget) => ({
      ...budget,
      status:
        budget.spent_amount > budget.budget_amount
          ? "over"
          : budget.spent_amount > budget.budget_amount * 0.9
            ? "warning"
            : "healthy",
    }));

    res.json(budgetsWithStatus);
  } catch (error) {
    console.error("Budget summary error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new budget
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, startDate, endDate } = req.body;

    const created = await Budget.create({
      user: req.user.id,
      category: category_id,
      amount,
      startDate: startDate,
      endDate: endDate,
    });

    const newBudget = await created.populate("category", "name type color");

    res.status(201).json(formatBudget(newBudget));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a budget
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { category_id, amount, startDate, endDate } = req.body;

    const updatedBudget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      {
        category: category_id,
        amount,
        startDate: startDate,
        endDate: endDate,
      },
      { new: true, runValidators: true },
    ).populate("category", "name type color");

    if (!updatedBudget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json(formatBudget(updatedBudget));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a budget
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    }).populate("category", "name type color");

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json(formatBudget(budget));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions for a specific budget period
router.get("/:id/transactions", authenticateToken, async (req, res) => {
  try {
    // First get the budget details
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("category", "name type color");

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    // Get transactions for the budget period, grouped by day
    const dailyTotals = await Transaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          date: { $gte: budget.startDate, $lte: budget.endDate },
        },
      },
      {
        $group: {
          _id: "$date",
          income: {
            $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
          },
          expenses: {
            $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Calculate savings for each day
    const dailyData = dailyTotals.map((day) => ({
      month: day._id,
      income: day.income || 0,
      expenses: day.expenses || 0,
      savings: (day.income || 0) - (day.expenses || 0),
    }));

    res.json({
      budget: formatBudget(budget),
      transactions: dailyData,
    });
  } catch (error) {
    console.error("Budget transactions error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
