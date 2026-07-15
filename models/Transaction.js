import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
    },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: 1 });
transactionSchema.index({ user: 1, category: 1, date: 1 });

export default mongoose.model('Transaction', transactionSchema);
