const User = require('../models/User');
const Skill = require('../models/Skill');
const ExchangeRequest = require('../models/ExchangeRequest');
const Session = require('../models/Session');
const Review = require('../models/Review');
const Category = require('../models/Category');

// GET /api/admin/stats
exports.stats = async (req, res) => {
  const [
    userCount,
    skillCount,
    requestCount,
    completedCount,
    sessionCount,
    reviewCount,
    byCategory
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Skill.countDocuments(),
    ExchangeRequest.countDocuments(),
    ExchangeRequest.countDocuments({ status: 'completed' }),
    Session.countDocuments(),
    Review.countDocuments(),
    Skill.aggregate([
      { $lookup: { from: 'categories', localField: 'category_id', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $group: { _id: '$cat.name', total: { $sum: 1 } } },
      { $project: { name: '$_id', total: 1, _id: 0 } }
    ])
  ]);

  res.json({ userCount, skillCount, requestCount, completedCount, sessionCount, reviewCount, byCategory });
};

// GET /api/admin/users
exports.listUsers = async (req, res) => {
  const users = await User.find().select('-password_hash').sort({ created_at: -1 }).lean();

  const reviewAgg = await Review.aggregate([
    { $group: { _id: '$reviewee_id', avg_rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
  ]);
  const ratingMap = {};
  reviewAgg.forEach(r => { ratingMap[r._id.toString()] = r; });

  res.json(users.map(u => ({
    ...u,
    avg_rating: ratingMap[u._id.toString()]?.avg_rating || 0,
    review_count: ratingMap[u._id.toString()]?.review_count || 0,
  })));
};

// PUT /api/admin/users/:id/status  { status: active|suspended }
exports.setUserStatus = async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  await User.findByIdAndUpdate(req.params.id, { status });
  res.json({ message: `User ${status}` });
};

// DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  await User.findOneAndDelete({ _id: req.params.id, role: { $ne: 'admin' } });
  res.json({ message: 'User removed' });
};

// GET /api/admin/skills
exports.listAllSkills = async (req, res) => {
  const skills = await Skill.find()
    .sort({ created_at: -1 })
    .populate('user_id', 'name')
    .populate('category_id', 'name')
    .lean();

  res.json(skills.map(s => ({
    ...s,
    owner_name: s.user_id?.name,
    category_name: s.category_id?.name,
  })));
};

// DELETE /api/admin/skills/:id
exports.deleteSkill = async (req, res) => {
  await Skill.findByIdAndDelete(req.params.id);
  res.json({ message: 'Skill removed' });
};

// GET /api/admin/requests
exports.listAllRequests = async (req, res) => {
  const rows = await ExchangeRequest.find()
    .sort({ created_at: -1 })
    .populate('skill_id', 'title')
    .populate('requester_id', 'name')
    .populate('provider_id', 'name')
    .lean();

  res.json(rows.map(r => ({
    ...r,
    skill_title: r.skill_id?.title,
    requester_name: r.requester_id?.name,
    provider_name: r.provider_id?.name,
  })));
};

// GET /api/admin/sessions
exports.listAllSessions = async (req, res) => {
  const sessions = await Session.find()
    .sort({ scheduled_at: -1 })
    .populate({
      path: 'request_id',
      select: 'skill_id requester_id provider_id',
      populate: [
        { path: 'skill_id', select: 'title' },
        { path: 'requester_id', select: 'name email' },
        { path: 'provider_id', select: 'name email' }
      ]
    })
    .lean();

  res.json(sessions.map(s => ({
    ...s,
    skill_title: s.request_id?.skill_id?.title || 'Unknown',
    requester_name: s.request_id?.requester_id?.name || 'Unknown',
    provider_name: s.request_id?.provider_id?.name || 'Unknown',
  })));
};

// GET /api/admin/reviews
exports.listAllReviews = async (req, res) => {
  const reviews = await Review.find()
    .sort({ created_at: -1 })
    .populate('reviewer_id', 'name email')
    .populate('reviewee_id', 'name email')
    .lean();

  res.json(reviews.map(r => ({
    ...r,
    reviewer_name: r.reviewer_id?.name || 'Unknown',
    reviewee_name: r.reviewee_id?.name || 'Unknown',
  })));
};
