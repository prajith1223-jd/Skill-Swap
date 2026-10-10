const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  session_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating:      { type: Number, required: true, min: 1, max: 5 },
  comment:     { type: String, default: '' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Review', reviewSchema);
