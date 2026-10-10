const router        = require('express').Router();
const passport      = require('../config/passport');   // configured passport instance
const auth          = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// ── Local auth ────────────────────────────────────────────────────────────────
router.post('/register', auth.register);
router.post('/login',    auth.login);
router.get('/me',        requireAuth, auth.me);

router.post('/send-otp', auth.sendOtp);
router.post('/verify-otp', auth.verifyOtp);

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Step 1: redirect to Google
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google callback
router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:5500') + '/index.html?error=oauth_failed',
  }),
  (req, res) => {
    const user  = req.user;
    const { signToken } = require('../utils/token');
    const token = signToken({ id: user._id, role: user.role });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
    const nextPage    = 'dashboard.html';
    const userPayload = encodeURIComponent(JSON.stringify({
      id:         user._id,
      name:       user.name,
      email:      user.email,
      role:       user.role,
      avatar_url: user.avatar_url,
      is_profile_setup: user.is_profile_setup,
    }));

    res.redirect(`${frontendUrl}/oauth-callback.html?token=${token}&user=${userPayload}&next=${nextPage}`);
  }
);

module.exports = router;
