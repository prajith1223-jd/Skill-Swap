const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name:        { type: String, required: true, maxlength: 80 },
  description: { type: String, default: '' },
  icon:        { type: String, default: '🏅' },
});

const userBadgeSchema = new mongoose.Schema({
  user_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  badge_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Badge', required: true },
  awarded_at: { type: Date, default: Date.now },
});

const Badge = mongoose.model('Badge', badgeSchema);
const UserBadge = mongoose.model('UserBadge', userBadgeSchema);

module.exports = { Badge, UserBadge };
