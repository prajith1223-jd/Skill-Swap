const router = require('express').Router();
const ctrl = require('../controllers/sessionController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.listSessions);
router.put('/:id', requireAuth, ctrl.updateSession);
router.get('/',                    requireAuth, ctrl.listSessions);
router.put('/:id',                 requireAuth, ctrl.updateSession);
router.post('/:id/generate-meet',  requireAuth, ctrl.generateMeet);

module.exports = router;
