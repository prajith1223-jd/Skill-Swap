const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  title:       { type: String, required: true, maxlength: 150 },
  description: { type: String, default: '' },
  level:       { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'], default: 'Beginner' },
  tags:        [{ type: String, maxlength: 50 }],
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('Skill', skillSchema);
