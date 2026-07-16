import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    // null/undefined user_id = a global/default category available to everyone
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
    },
    color: {
      type: String,
      default: '#000000',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
