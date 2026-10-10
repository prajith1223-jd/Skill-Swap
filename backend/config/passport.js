// config/passport.js
const passport       = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User           = require('../models/User');

passport.use('google', new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email      = profile.emails?.[0]?.value;
    const name       = profile.displayName || 'Google User';
    const avatar_url = profile.photos?.[0]?.value || null;
    const google_id  = profile.id;

    if (!email) return done(null, false, { message: 'No email from Google' });

    // Find by google_id OR existing email account
    let user = await User.findOne({ $or: [{ google_id }, { email }] });

    if (user) {
      // Link Google to existing account if not yet linked
      if (!user.google_id) {
        user.google_id     = google_id;
        user.auth_provider = 'google';
        if (!user.avatar_url) user.avatar_url = avatar_url;
        await user.save();
      }
    } else {
      // Brand new user via Google
      user = await User.create({
        name,
        email,
        google_id,
        avatar_url,
        auth_provider:    'google',
        password_hash:    null,
        is_profile_setup: false,
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done)   => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try   { done(null, await User.findById(id).lean()); }
  catch (err) { done(err); }
});

module.exports = passport;
