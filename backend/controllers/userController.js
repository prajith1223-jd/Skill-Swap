const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Skill = require('../models/Skill');
const { Badge, UserBadge } = require('../models/Badge');
const Review = require('../models/Review');
const ExchangeRequest = require('../models/ExchangeRequest');
const Session = require('../models/Session');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

// GET /api/users/:id  (public profile)
exports.getProfile = async (req, res) => {
  const id = (req.params.id === 'me') ? req.user.id : (req.params.id || req.user.id);
  const user = await User.findById(id).select('-password_hash');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Aggregate avg rating
  const ratingAgg = await Review.aggregate([
    { $match: { reviewee_id: user._id } },
    { $group: { _id: null, avg_rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
  ]);
  const avg_rating = ratingAgg[0] ? Math.round(ratingAgg[0].avg_rating * 10) / 10 : 0;
  const review_count = ratingAgg[0] ? ratingAgg[0].review_count : 0;

  const skills = await Skill.find({ user_id: id }).populate('category_id', 'name');
  const userBadges = await UserBadge.find({ user_id: id }).populate('badge_id');
  const badges = userBadges.map(ub => ub.badge_id);

  // --- Dynamic Badges ---
  const dynamicBadges = [];
  if (avg_rating >= 4.5 && review_count > 0) {
    dynamicBadges.push({ _id: 'high_review', name: 'High Review Teacher', description: 'Maintains an excellent rating from students.', icon: '🌟' });
  }
  if (skills.length >= 3) {
    dynamicBadges.push({ _id: 'pro_skiller', name: 'Pro Skiller', description: 'Offers 3 or more skills to the community.', icon: '🚀' });
  }
  if (review_count >= 5) {
    dynamicBadges.push({ _id: 'trusted', name: 'Trusted Member', description: 'Has successfully completed multiple sessions with reviews.', icon: '🛡️' });
  }
  badges.push(...dynamicBadges);

  res.json({ ...user.toObject(), avg_rating, review_count, skills, badges, coins: user.coins });
};

// PUT /api/users/me
exports.updateProfile = async (req, res) => {
  const { name, bio, avatar_url, gmail, github_url, linkedin_url, phone_number } = req.body;
  const update = {};
  if (name !== undefined) update.name = name;
  if (bio !== undefined) update.bio = bio;
  if (avatar_url !== undefined) update.avatar_url = avatar_url;
  if (gmail !== undefined) update.gmail = gmail;
  if (github_url !== undefined) update.github_url = github_url;
  if (linkedin_url !== undefined) update.linkedin_url = linkedin_url;
  if (phone_number !== undefined) update.phone_number = phone_number;
  await User.findByIdAndUpdate(req.user.id, update);
  res.json({ message: 'Profile updated' });
};

// POST /api/users/me/avatar
exports.uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const avatar_url = `http://localhost:${process.env.PORT || 5000}/uploads/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.id, { avatar_url });
  res.json({ message: 'Avatar uploaded', avatar_url });
};

// PUT /api/users/me/password
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ message: 'Valid current and new password required' });
  }
  const user = await User.findById(req.user.id);
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 10);
  await User.findByIdAndUpdate(req.user.id, { password_hash: hash });
  res.json({ message: 'Password changed successfully' });
};

const crypto = require('crypto');

// GET /api/users/me/coins/config
exports.getRazorpayConfig = (req, res) => {
  res.json({ key_id: process.env.CASHFREE_APP_ID || 'dummy_cashfree_app_id' });
};

// POST /api/users/me/coins/order
exports.createCoinOrder = async (req, res) => {
  const { amount, price } = req.body;
  if (!amount || amount <= 0 || !price) return res.status(400).json({ message: 'Invalid amount or price' });
  
  try {
    const orderId = `order_cf_${req.user.id}_${Date.now()}`;
    
    // If using a dummy key, mock the response to allow the frontend to proceed in offline mode
    if (!process.env.CASHFREE_APP_ID || process.env.CASHFREE_APP_ID === 'dummy_cashfree_app_id') {
      return res.json({
        order_id: orderId,
        payment_session_id: `session_mock_${Date.now()}`,
        mock: true
      });
    }

    const payload = {
      order_id: orderId,
      order_amount: Math.round(price), // Cashfree expects amount in rupees, not paise, e.g., 10.00
      order_currency: "INR",
      customer_details: {
        customer_id: req.user.id.toString(),
        customer_phone: "9999999999",
        customer_name: req.user.name || "User",
        customer_email: req.user.email || "user@example.com"
      },
      order_meta: {
        return_url: "http://localhost:5500/buy-coins.html" // Usually ignored for seamless checkout
      }
    };

    const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Error creating Cashfree order');

    res.json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      mock: false
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Cashfree order', error: error.message || error });
  }
};

// POST /api/users/me/coins/verify
exports.verifyCoinPayment = async (req, res) => {
  const { amount, order_id } = req.body;
  
  if (!process.env.CASHFREE_APP_ID || process.env.CASHFREE_APP_ID === 'dummy_cashfree_app_id') {
    // Mock mode validation bypass
    console.log('Skipping Cashfree API check due to dummy keys.');
  } else {
    // Verify by querying Cashfree API
    try {
      const response = await fetch(`https://sandbox.cashfree.com/pg/orders/${order_id}`, {
        method: 'GET',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01'
        }
      });
      const data = await response.json();
      
      if (data.order_status !== 'PAID') {
        return res.status(400).json({ message: 'Payment verification failed or pending' });
      }
    } catch (err) {
      return res.status(500).json({ message: 'Error verifying Cashfree payment' });
    }
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  user.coins = (user.coins || 0) + Number(amount);
  await user.save();
  
  res.json({ message: 'Coins added successfully', coins: user.coins });
};

// GET /api/users/me/dashboard  (summary stats)
exports.dashboard = async (req, res) => {
  const uid = req.user.id;

  const [
    skillCount,
    pendingRequests,
    unreadMessages,
    unreadNotifs,
    ratingAgg,
    recentRequests,
    upcomingSessions,
    recommendedMatches
  ] = await Promise.all([
    Skill.countDocuments({ user_id: uid }),
    ExchangeRequest.countDocuments({ $or: [{ requester_id: uid }, { provider_id: uid }], status: 'pending' }),
    Message.countDocuments({ receiver_id: uid, is_read: false }),
    Notification.countDocuments({ user_id: uid, is_read: false }),
    Review.aggregate([
      { $match: { reviewee_id: require('mongoose').Types.ObjectId.createFromHexString(uid.toString()) } },
      { $group: { _id: null, avg_rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
    ]),
    ExchangeRequest.find({ $or: [{ requester_id: uid }, { provider_id: uid }] })
      .sort({ created_at: -1 }).limit(5)
      .populate('skill_id', 'title')
      .populate('requester_id', 'name')
      .populate('provider_id', 'name'),
    (async () => {
      const userReqs = await ExchangeRequest.find({ $or: [{ requester_id: uid }, { provider_id: uid }] }).select('_id');
      const requestIds = userReqs.map(r => r._id);
      return Session.countDocuments({ request_id: { $in: requestIds }, status: 'upcoming' });
    })(),
    Skill.find({ user_id: { $ne: uid } })
      .populate('user_id', 'name avatar_url')
      .sort({ created_at: -1 })
      .limit(3)
      .lean()
  ]);

  const userRecord = await User.findById(uid).select('coins');
  
  res.json({
    skillCount,
    pendingRequests,
    upcomingSessions,
    unreadMessages,
    unreadNotifs,
    coins: userRecord?.coins || 0,
    avgRating: ratingAgg[0] ? Math.round(ratingAgg[0].avg_rating * 10) / 10 : 0,
    reviewCount: ratingAgg[0] ? ratingAgg[0].review_count : 0,
    recentRequests: recentRequests.map(r => ({
      ...r.toObject(),
      skill_title: r.skill_id?.title,
      requester_name: r.requester_id?.name,
      provider_name: r.provider_id?.name,
    })),
    recommendedMatches: recommendedMatches.map(m => ({
      id: m._id,
      title: m.title,
      level: m.level,
      provider_name: m.user_id?.name,
      provider_avatar: m.user_id?.avatar_url
    }))
  });
};
