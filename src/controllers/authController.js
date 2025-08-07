import bcrypt from 'bcrypt';
import Owner from '../models/Owner.js';
import Jeweler from '../models/Jeweler.js';

/**
 * Handles the registration of new users.
 * It checks the 'role' to determine whether to create an Owner or a Jeweler.
 */
export const register = async (req, res) => {
  try {
    const { role, username, email, phone_number, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let newUser;

    if (role === 'Owner') {
        if (!email) {
            return res.status(400).json({ message: 'Email is required for Owners.'});
        }
        newUser = await Owner.create({ username, email, password_hash: hashedPassword });
    } else if (role === 'Jeweler') {
        if (!phone_number) {
            return res.status(400).json({ message: 'Phone number is required for Jewelers.'});
        }
        newUser = await Jeweler.create({ username, phone_number, password_hash: hashedPassword });
    } else {
        return res.status(400).json({ message: 'Invalid role specified. Must be "Owner" or "Jeweler".' });
    }

    // Remove the password hash from the response for security
    const { password_hash, ...userResponse } = newUser;
    res.status(201).json({ message: 'User registered successfully', user: userResponse });

  } catch (error) {
    // Handle cases where the username, email, or phone number is already taken
    if (error.code === '23505') { // PostgreSQL unique violation error code
        return res.status(409).json({ message: 'A user with this username, email, or phone number already exists.' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error during registration.' });
  }
};

/**
 * This function is called by the login route after Passport.js successfully authenticates a user.
 * It sends a success response containing the user's basic info and, crucially, their userType.
 */
export const loginSuccess = (req, res) => {
  // req.user is populated by Passport's deserializeUser function and is guaranteed
  // to have the userType property from our corrected passport.js configuration.
  const user = req.user;
  res.json({
    message: 'Login successful.',
    user: {
      id: user.id,
      username: user.username,
      userType: user.userType // This confirms the user's role in the response
    }
  });
};

/**
 * Handles logging the user out, destroying their session, and clearing the session cookie.
 */
export const logout = (req, res, next) => {
  req.logout(function(err) {
    if (err) { 
      console.error('Logout error:', err);
      return next(err); 
    }
    // Destroy the session data on the server
    req.session.destroy(() => {
        // Clear the cookie on the client's browser
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logout successful.' });
    });
  });
};
