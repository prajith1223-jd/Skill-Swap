const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../utils/token');

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ message: 'Password must be at least 4 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password_hash: hash,
      role: 'user',
      avatar_url: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
    });

    const payload = { id: user._id, name: user.name, email: user.email, role: user.role };
    const token = signToken(payload);
    res.status(201).json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account has been suspended' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    const payload = { id: user._id, name: user.name, email: user.email, role: user.role };
    const token = signToken(payload);
    res.json({ token, user: { ...payload, avatar_url: user.avatar_url, bio: user.bio, status: user.status, created_at: user.created_at } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password_hash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
};

// Simple in-memory OTP store (for production, use Redis or DB)
const otpStore = new Map();

// POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Phone number required' });
  
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  otpStore.set(phone, { otp, expires: Date.now() + 5 * 60000 }); // 5 min expiry
  
  // Here you would integrate with Twilio:
  // const client = require('twilio')(accountSid, authToken);
  // await client.messages.create({ body: `Your SkillSwap code is ${otp}`, from: '+123', to: phone });
  
  console.log(`[Twilio Mock] Sent OTP ${otp} to ${phone}`);
  res.json({ message: 'OTP sent' });
};

// POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: 'Phone and OTP required' });
  
  const record = otpStore.get(phone);
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    return res.status(401).json({ message: 'Invalid or expired OTP' });
  }
  
  otpStore.delete(phone);
  
  // Find or create user based on phone
  // Assuming email is required, we might create a dummy email if none exists,
  // or you could update your User model to allow phone login.
  // We'll mock a login for demo@gmail.com
  const user = await User.findOne({ email: 'demo@gmail.com' });
  if (!user) return res.status(404).json({ message: 'User not found. Try email login.' });
  
  const payload = { id: user._id, name: user.name, email: user.email, role: user.role };
  const token = signToken(payload);
  res.json({ token, user: { ...payload, avatar_url: user.avatar_url, bio: user.bio, status: user.status, created_at: user.created_at } });
};

