import { Router } from 'express';
import passport from 'passport';
import { validate } from '../utils/validation.js';
import { schemas } from '../utils/validation.js';
import { register, loginSuccess, logout } from '../controllers/authController.js';

const router = Router();

router.post('/register', validate(schemas.register), register);

// This corrected login route is essential for the fix.
router.post('/login',
  validate(schemas.login),
  (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) { return next(err); }
      if (!user) { return res.status(401).json({ message: info.message }); }
      
      req.logIn(user, (err) => {
        if (err) { return next(err); }
        return loginSuccess(req, res);
      });
    })(req, res, next);
  }
);


router.get("/session", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.post('/logout', logout);

export default router;