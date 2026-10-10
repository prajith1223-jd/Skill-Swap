const mongoose = require('mongoose');

// Generate a Google Meet-style room code (xxx-xxxx-xxx)
function genMeetCode() {
  const chars = 'abcdefghijkmnopqrstuvwxyz';
  const seg = (n) => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('');
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

const sessionSchema = new mongoose.Schema({
  request_id:       { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest', required: true },
  scheduled_at:     { type: Date, required: true },
  duration_minutes: { type: Number, default: 60 },
  status:           { type: String, enum: ['upcoming', 'pending_completion', 'completed', 'cancelled'], default: 'upcoming' },
  notes:            { type: String, default: '' },
  // Google Meet integration
  meet_link:        { type: String, default: '' },   // full meet URL
  meet_code:        { type: String, default: '' },   // xxx-xxxx-xxx room code
  calendar_link:    { type: String, default: '' },   // Google Calendar event link
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// Auto-generate a Jitsi Meet link before saving if not set
sessionSchema.pre('save', function(next) {
  if (!this.meet_code) {
    this.meet_code = 'skillswap-' + genMeetCode();
    this.meet_link = `https://meet.jit.si/${this.meet_code}`;
  }
  if (next && typeof next === 'function') next();
});

module.exports = mongoose.model('Session', sessionSchema);
