const router = require('express').Router();
const ctrl = require('../controllers/skillController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.listSkills);
router.get('/:id', requireAuth, ctrl.getSkill);
router.post('/', requireAuth, ctrl.createSkill);
router.delete('/:id', requireAuth, ctrl.deleteSkill);

module.exports = router;
