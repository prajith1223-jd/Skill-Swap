const Skill = require('../models/Skill');
const Category = require('../models/Category');
const Review = require('../models/Review');

// GET /api/skills?category=&level=&q=&sort=
exports.listSkills = async (req, res) => {
  const { category, level, q, sort } = req.query;
  const filter = {
    user_id: { $ne: req.user.id }
  };

  if (category && category !== 'All') {
    const cat = await Category.findOne({ name: category });
    if (cat) filter.category_id = cat._id;
    else return res.json([]); // no matching category
  }
  if (level && level !== 'All Levels') filter.level = level;
  if (q) {
    const regex = new RegExp(q, 'i');
    filter.$or = [{ title: regex }, { description: regex }];
  }

  let skills = await Skill.find(filter)
    .populate('user_id', 'name avatar_url')
    .populate('category_id', 'name')
    .lean();

  // Attach avg ratings
  const userIds = [...new Set(skills.map(s => s.user_id?._id?.toString()))];
  const ratings = await Review.aggregate([
    { $match: { reviewee_id: { $in: userIds.map(id => require('mongoose').Types.ObjectId.createFromHexString(id)) } } },
    { $group: { _id: '$reviewee_id', avg_rating: { $avg: '$rating' }, review_count: { $sum: 1 } } }
  ]);
  const ratingMap = {};
  ratings.forEach(r => { ratingMap[r._id.toString()] = r; });

  skills = skills.map(s => ({
    ...s,
    id: s._id,
    owner_name: s.user_id?.name,
    owner_avatar: s.user_id?.avatar_url,
    category_name: s.category_id?.name,
    rating: ratingMap[s.user_id?._id?.toString()]?.avg_rating || 0,
    review_count: ratingMap[s.user_id?._id?.toString()]?.review_count || 0,
  }));

  if (sort === 'newest') {
    skills.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } else {
    skills.sort((a, b) => b.rating - a.rating || b.review_count - a.review_count);
  }

  res.json(skills);
};

// GET /api/skills/:id
exports.getSkill = async (req, res) => {
  const skill = await Skill.findById(req.params.id)
    .populate('user_id', 'name avatar_url')
    .populate('category_id', 'name')
    .lean();
  if (!skill) return res.status(404).json({ message: 'Skill not found' });

  res.json({
    ...skill,
    owner_name: skill.user_id?.name,
    owner_avatar: skill.user_id?.avatar_url,
    category_name: skill.category_id?.name,
  });
};

// POST /api/skills  (Offer a Skill)
exports.createSkill = async (req, res) => {
  const { title, description, level, category_id, tags } = req.body;
  if (!title || !category_id) return res.status(400).json({ message: 'Title and category are required' });

  const skill = await Skill.create({
    user_id: req.user.id,
    category_id,
    title,
    description: description || '',
    level: level || 'Beginner',
    tags: Array.isArray(tags) ? tags.filter(Boolean).map(t => t.trim()) : [],
  });

  res.status(201).json({ message: 'Skill offered successfully', skillId: skill._id });
};

// DELETE /api/skills/:id
exports.deleteSkill = async (req, res) => {
  const skill = await Skill.findById(req.params.id);
  if (!skill) return res.status(404).json({ message: 'Skill not found' });
  if (skill.user_id.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized to delete this skill' });
  }
  await skill.deleteOne();
  res.json({ message: 'Skill removed' });
};

// GET /api/categories
exports.listCategories = async (req, res) => {
  const cats = await Category.find().sort({ name: 1 });
  res.json(cats);
};
