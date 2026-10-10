const mongoose = require('mongoose');

const exchangeRequestSchema = new mongoose.Schema({
  requester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  provider_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill_id:           { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  offered_skill_id:   { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },
  message:            { type: String, default: '' },
  status:       {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  offered_coin: { type: Boolean, default: false },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('ExchangeRequest', exchangeRequestSchema);
