const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    cb(null, `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.post('/me/avatar', requireAuth, upload.single('avatar'), ctrl.uploadAvatar);
router.get('/me/dashboard', requireAuth, ctrl.dashboard);
router.put('/me', requireAuth, ctrl.updateProfile);
router.get('/me/coins/config', requireAuth, ctrl.getRazorpayConfig);
router.post('/me/coins/order', requireAuth, ctrl.createCoinOrder);
router.post('/me/coins/verify', requireAuth, ctrl.verifyCoinPayment);
router.put('/me/password', requireAuth, ctrl.changePassword);
router.get('/:id', requireAuth, ctrl.getProfile);

module.exports = router;
