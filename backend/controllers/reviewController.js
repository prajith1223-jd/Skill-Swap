const Review = require('../models/Review');
const { Badge, UserBadge } = require('../models/Badge');
const { pushNotification } = require('./notificationController');

// GET /api/reviews/:userId  -> reviews received by a user
exports.listForUser = async (req, res) => {
  const rows = await Review.find({ reviewee_id: req.params.userId })
    .sort({ created_at: -1 })
    .populate('reviewer_id', 'name avatar_url')
    .lean();

  res.json(rows.map(r => ({
    ...r,
    reviewer_name: r.reviewer_id?.name,
    reviewer_avatar: r.reviewer_id?.avatar_url,
  })));
};

// GET /api/reviews/me  -> reviews I have written
exports.myReviews = async (req, res) => {
  const rows = await Review.find({ reviewer_id: req.user.id })
    .sort({ created_at: -1 })
    .populate('reviewee_id', 'name')
    .lean();

  res.json(rows.map(r => ({ ...r, reviewee_name: r.reviewee_id?.name })));
};

// POST /api/reviews  { reviewee_id, session_id, rating, comment }
exports.createReview = async (req, res) => {
  const { reviewee_id, session_id, rating, comment } = req.body;
  if (!reviewee_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'reviewee_id and rating (1-5) are required' });
  }
  if (reviewee_id.toString() === req.user.id.toString()) {
    return res.status(400).json({ message: "You can't review yourself" });
  }

  const review = await Review.create({
    session_id: session_id || null,
    reviewer_id: req.user.id,
    reviewee_id,
    rating,
    comment: comment || '',
  });

  // Auto-award the "5-Star Mentor" badge
  if (Number(rating) === 5) {
    const badge = await Badge.findOne({ name: '5-Star Mentor' });
    if (badge) {
      const alreadyHas = await UserBadge.findOne({ user_id: reviewee_id, badge_id: badge._id });
      if (!alreadyHas) {
        await UserBadge.create({ user_id: reviewee_id, badge_id: badge._id });
      }
    }
  }

  await pushNotification(req.app.get('io'), reviewee_id, 'review',
    `${req.user.name} left you a ${rating}-star review`, '/frontend/reviews.html');

  res.status(201).json({ message: 'Review submitted', reviewId: review._id });
};
