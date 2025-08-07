import rl from 'express-rate-limit';
export default rl({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true
});
