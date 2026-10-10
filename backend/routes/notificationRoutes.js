const router = require('express').Router();
const ctrl = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.listNotifications);
router.put('/read-all', requireAuth, ctrl.markAllRead);
router.put('/:id/read', requireAuth, ctrl.markRead);

module.exports = router;
