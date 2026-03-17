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

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: (process.env.FRONTEND_URL || 'https://unipixcode.xyz') + "/api/auth/google/callback",
    proxy: true
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists
      console.log('--- Passport Strategy: Checking user for googleId:', profile.id);
      let user = await User.findOne({ where: { googleId: profile.id } });

      if (user) {
        console.log('--- Passport Strategy: User found:', user.email);
        return done(null, user);
      }

      console.log('--- Passport Strategy: User not found, creating new account for:', profile.emails[0].value);

      // Fetch Welcome Bonus from settings
      let welcomeBonus = 50;
      try {
          const bonusSetting = await GlobalSetting.findByPk('welcome_bonus');
          if (bonusSetting) {
            welcomeBonus = parseInt(bonusSetting.value);
            console.log('--- Passport Strategy: welcome_bonus from DB:', welcomeBonus);
          } else {
            console.log('--- Passport Strategy: welcome_bonus setting not found, using default 50');
          }
      } catch (e) {
          console.warn('Could not fetch welcome_bonus setting, using default 50');
      }

      // If not, create a new user
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        credits: welcomeBonus,
        role: 'user' // Default role
      });

      console.log('--- Passport Strategy: New user created with', welcomeBonus, 'credits');
      done(null, user);
    } catch (err) {
      console.error('--- Passport Strategy: Error creating user:', err);
      done(err, null);
    }
  }
));
