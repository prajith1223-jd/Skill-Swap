const router = require('express').Router();
const ctrl = require('../controllers/skillController');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.listCategories);

module.exports = router;
