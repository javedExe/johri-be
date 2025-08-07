import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import userService from '../services/userService.js';
import { isAccountLocked } from '../utils/security.js';
import { logPasswordResetEvent, AUDIT_EVENTS } from '../services/auditService.js';

/* ──────────────────────────────────────────────────────
   SESSION SERIALIZATION & DESERIALIZATION
   ────────────────────────────────────────────────────── */

// Store only user ID in session for security and performance
passport.serializeUser((user, done) => {
  console.log(`Serializing user: ${user.id}`);
  done(null, user.id);
});

// Retrieve full user object from database using stored ID
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userService.findById(id);
    
    if (!user) {
      console.warn(`User not found during deserialization: ID ${id}`);
      return done(null, false);
    }

    // Check if user account is still active (not locked permanently)
    if (user.is_locked && user.lockout_expires_at && new Date() >= new Date(user.lockout_expires_at)) {
      // Auto-unlock expired lockouts
      await userService.unlockUserAccount(user.id);
      user.is_locked = false;
      user.lockout_expires_at = null;
      console.log(`Auto-unlocked expired lockout for user: ${user.id}`);
    }

    console.log(`Successfully deserialized user: ${user.id}`);
    done(null, user);
    
  } catch (error) {
    console.error('Deserialization error:', error);
    done(error);
  }
});

/* ──────────────────────────────────────────────────────
   LOCAL USERNAME/PASSWORD AUTHENTICATION STRATEGY
   ────────────────────────────────────────────────────── */

passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true  // Enable access to request object for logging
  },
  async (req, username, password, done) => {
    try {
      console.log(`Login attempt for username: ${username}`);
      
      // Find user by username
      const user = await userService.findByUsername(username);
      
      if (!user) {
        console.warn(`Login failed: User not found - ${username}`);
        return done(null, false, { 
          message: 'Incorrect username or password.' 
        });
      }

      // Check if account is currently locked
      if (isAccountLocked(user)) {
        console.warn(`Login blocked: Account locked - User ID: ${user.id}`);
        
        // Log the blocked attempt for audit
        await logPasswordResetEvent(user.id, AUDIT_EVENTS.OTP_FAILED, req, {
          reason: 'Login attempt on locked account',
          username: username
        });
        
        const lockoutMessage = user.lockout_expires_at 
          ? `Account is temporarily locked until ${new Date(user.lockout_expires_at).toLocaleString()}. Use password reset to unlock immediately.`
          : 'Account is temporarily locked. Please try again later or use password reset.';
          
        return done(null, false, { 
          message: lockoutMessage 
        });
      }

      // Auto-unlock if lockout period has expired
      if (user.is_locked && user.lockout_expires_at && new Date() >= new Date(user.lockout_expires_at)) {
        await userService.unlockUserAccount(user.id);
        user.is_locked = false;
        user.lockout_expires_at = null;
        console.log(`Auto-unlocked expired lockout during login for user: ${user.id}`);
      }

      // Verify password using secure comparison
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        console.warn(`Login failed: Invalid password - User ID: ${user.id}`);
        
        // Log failed login attempt for security monitoring
        await logPasswordResetEvent(user.id, AUDIT_EVENTS.OTP_FAILED, req, {
          reason: 'Invalid password during login',
          username: username
        });
        
        return done(null, false, { 
          message: 'Incorrect username or password.' 
        });
      }

      // Successful authentication
      console.log(`Login successful for user: ${user.id} (${username})`);
      
      // Log successful login for audit trail
      await logPasswordResetEvent(user.id, 'login_success', req, {
        username: username,
        loginTime: new Date().toISOString()
      });

      // Remove sensitive data before returning user object
      const sanitizedUser = {
        ...user,
        password_hash: undefined  // Never expose password hash
      };

      return done(null, sanitizedUser);
      
    } catch (error) {
      console.error('Local authentication error:', error);
      return done(error);
    }
  }
));

/* ──────────────────────────────────────────────────────
   GOOGLE OAUTH 2.0 AUTHENTICATION STRATEGY
   ────────────────────────────────────────────────────── */

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email'],
    passReqToCallback: true  // Enable access to request object
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      console.log(`Google OAuth attempt for profile: ${profile.id}`);
      
      // Extract and validate email from Google profile
      const email = profile.emails?.[0]?.value;
      
      if (!email) {
        console.error('Google OAuth error: No email found in profile');
        return done(new Error('No email found in Google profile. Please ensure your Google account has a verified email address.'));
      }

      // Check if user exists and if account is locked
      const existingUser = await userService.findByEmail(email);
      if (existingUser && isAccountLocked(existingUser)) {
        console.warn(`Google OAuth blocked: Account locked - User ID: ${existingUser.id}`);
        
        await logPasswordResetEvent(existingUser.id, AUDIT_EVENTS.OTP_FAILED, req, {
          reason: 'Google OAuth attempt on locked account',
          email: email
        });
        
        return done(new Error('Your account is temporarily locked. Please use password reset to unlock your account.'));
      }

      // Create or update user with Google profile data
      const user = await userService.upsertGoogle(profile.id, email, {
        name: profile.displayName,
        picture: profile.photos?.[0]?.value,
        locale: profile._json.locale,
        verified_email: profile._json.verified_email
      });

      console.log(`Google OAuth successful for user: ${user.id} (${email})`);
      
      // Log successful Google login
      await logPasswordResetEvent(user.id, 'google_login_success', req, {
        email: email,
        googleId: profile.id,
        loginTime: new Date().toISOString()
      });

      // Remove sensitive data
      const sanitizedUser = {
        ...user,
        password_hash: undefined
      };

      return done(null, sanitizedUser);
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      
      // Log failed Google OAuth attempt
      if (error.message.includes('locked')) {
        return done(error);  // Return locked account error as-is
      }
      
      return done(new Error('Google authentication failed. Please try again or contact support.'));
    }
  }
));

/* ──────────────────────────────────────────────────────
   AUTHENTICATION MIDDLEWARE HELPERS
   ────────────────────────────────────────────────────── */

// Custom middleware to check authentication and account status
export const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    // Additional check for account status
    if (req.user && isAccountLocked(req.user)) {
      req.logout((err) => {
        if (err) console.error('Logout error:', err);
        return res.status(423).json({
          message: 'Your account has been locked. Please use password reset to unlock.'
        });
      });
      return;
    }
    return next();
  }
  
  res.status(401).json({ 
    message: 'Authentication required. Please log in.' 
  });
};

// Middleware to ensure user is not locked before allowing certain actions
export const ensureNotLocked = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  
  // Re-fetch user to get latest lock status
  const currentUser = await userService.findById(req.user.id);
  
  if (isAccountLocked(currentUser)) {
    req.logout((err) => {
      if (err) console.error('Logout error:', err);
    });
    
    return res.status(423).json({
      message: 'Your account is locked. Please use password reset to unlock.'
    });
  }
  
  next();
};

/* ──────────────────────────────────────────────────────
   ENVIRONMENT VALIDATION
   ────────────────────────────────────────────────────── */

// Validate required environment variables on startup
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 
  'GOOGLE_CALLBACK_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  console.error('Please check your .env file configuration.');
}

// Log configuration status
console.log('Passport strategies configured:');
console.log('✓ Local Strategy (username/password)');
console.log('✓ Google OAuth Strategy');
console.log(`✓ Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? 'Present' : 'Missing'}`);
console.log(`✓ Callback URL: ${process.env.GOOGLE_CALLBACK_URL || 'Not configured'}`);

export default passport;
