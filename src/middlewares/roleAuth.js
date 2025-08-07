import { getName } from '../models/Role.js';

// The middleware now accepts either a single role string or an array of role strings
export default roles => async (req, res, next) => {
  // Ensure the list of allowed roles is always an array
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  // Get the current user's role name from the database
  const userRoleName = await getName(req.user.role_id);
  
  // Check if the user's role is in the list of allowed roles
  return allowedRoles.includes(userRoleName)
    ? next() // If their role is allowed, continue to the next step
    : res.status(403).json({ message: 'Forbidden: You do not have the required permissions.' }); // Otherwise, block access
};