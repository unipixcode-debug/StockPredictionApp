const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const GlobalSetting = require('../models/GlobalSetting');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

const callbackURL = process.env.GOOGLE_CALLBACK_URL || (process.env.FRONTEND_URL || 'https://unipixcode.xyz') + "/api/auth/google/callback";
console.log(`[AUTH-CONFIG] Passport callbackURL: "${callbackURL}"`);

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {

      const email = profile.emails[0].value;
      console.log(`[AUTH] Google login attempt: ${email} (ID: ${profile.id})`);
      
      // 1. Try by googleId
      let user = await User.findOne({ where: { googleId: profile.id } });

      // 2. Fallback to Email (Prevents duplicating accounts if user logs in with same email but Google metadata changes)
      if (!user) {
        console.log(`[AUTH] User not found by googleId, searching by email: ${email}`);
        user = await User.findOne({ where: { email } });
        
        if (user) {
          console.log(`[AUTH] User found by email, linking googleId: ${profile.id}`);
          await user.update({ googleId: profile.id });
        }
      }

      if (user) {
        console.log(`[AUTH] Login successful: ${user.email} (UUID: ${user.id})`);
        return done(null, user);
      }

      console.log(`[AUTH] Account not found, creating new profile for: ${email}`);

      // Fetch Welcome Bonus
      let welcomeBonus = 50;
      try {
          const bonusSetting = await GlobalSetting.findByPk('welcome_bonus');
          welcomeBonus = bonusSetting ? parseInt(bonusSetting.value) : 50;
      } catch (e) {
          console.warn('[AUTH] Settings fetch failed, using default bonus.');
      }

      // 3. Create New User
      user = await User.create({
        googleId: profile.id,
        email: email,
        name: profile.displayName,
        credits: welcomeBonus,
        role: 'user'
      });

      console.log(`[AUTH] New account initialized: ${user.email} (UUID: ${user.id})`);
      done(null, user);
    } catch (err) {
      console.error('[AUTH] Strategy error:', err);
      done(err, null);
    }
  }
));
