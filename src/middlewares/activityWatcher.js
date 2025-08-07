const warn = +process.env.SESSION_WARN_MS;
const idle = +process.env.SESSION_IDLE_MS;

export default (req, res, next) => {
  if (!req.isAuthenticated()) return next();
  const now = Date.now();
  const last = req.session.lastActivity || now;
  const diff = now - last;

  if (diff > idle) {
    req.logout(() => res.status(440).json({ message: 'You have been logged out due to inactivity.' }));
    return;
  }
  // send warning header
  if (diff > warn) res.set('X-Session-Warning', 'expiring');

  req.session.lastActivity = now;
  next();
};
