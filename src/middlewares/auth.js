export default (req, res, next) =>
  req.isAuthenticated() ? next() : res.status(401).json({ message: 'Unauthenticated' });
