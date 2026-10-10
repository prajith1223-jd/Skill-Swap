const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:          { type: String, required: true, maxlength: 120 },
  email:         { type: String, required: true, unique: true, lowercase: true, maxlength: 150 },
  password_hash: { type: String, default: null },   // null for OAuth-only users
  role:          { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar_url:    { type: String, default: null },
  bio:           { type: String, default: '' },
  status:        { type: String, enum: ['active', 'suspended'], default: 'active' },
  // OAuth fields
  google_id:     { type: String, default: null, sparse: true },
  auth_provider: { type: String, enum: ['local', 'google', 'phone'], default: 'local' },
  phone_number:  { type: String, default: null },
  is_profile_setup: { type: Boolean, default: false }, // tracks onboarding step 2
  // Social links
  gmail:         { type: String, default: '' },
  github_url:    { type: String, default: '' },
  linkedin_url:  { type: String, default: '' },
  
  // Time-banking
  coins:         { type: Number, default: 2 },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

module.exports = mongoose.model('User', userSchema);
