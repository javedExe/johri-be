import userService from './userService.js';
import bcrypt      from 'bcrypt';

export const validateLocal = async (username, password) => {
  const user = await userService.findByUsername(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  return ok ? user : null;
};
