const router = require('express').Router();
const ctrl = require('../controllers/requestController');
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, ctrl.createRequest);
router.get('/', requireAuth, ctrl.listRequests);
router.put('/:id/status', requireAuth, ctrl.updateStatus);

module.exports = router;
