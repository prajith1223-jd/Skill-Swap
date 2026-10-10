const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);
router.get('/stats', ctrl.stats);
router.get('/users', ctrl.listUsers);
router.put('/users/:id/status', ctrl.setUserStatus);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/skills', ctrl.listAllSkills);
router.delete('/skills/:id', ctrl.deleteSkill);
router.get('/requests', ctrl.listAllRequests);
router.get('/sessions', ctrl.listAllSessions);
router.get('/reviews', ctrl.listAllReviews);

module.exports = router;
