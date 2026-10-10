const router = require('express').Router();
const ctrl = require('../controllers/messageController');
const { requireAuth } = require('../middleware/auth');

router.get('/conversations', requireAuth, ctrl.listConversations);
router.get('/:userId', requireAuth, ctrl.getThread);
router.post('/', requireAuth, ctrl.sendMessage);

module.exports = router;
