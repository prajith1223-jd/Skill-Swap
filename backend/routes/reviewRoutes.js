const router = require('express').Router();
const ctrl = require('../controllers/reviewController');
const { requireAuth } = require('../middleware/auth');

router.get('/me', requireAuth, ctrl.myReviews);
router.get('/:userId', requireAuth, ctrl.listForUser);
router.post('/', requireAuth, ctrl.createReview);

module.exports = router;
