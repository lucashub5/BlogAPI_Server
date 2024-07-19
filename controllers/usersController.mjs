import asyncHandler from 'express-async-handler';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import User from '../models/user.mjs';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const registerUserValidators = [
  body('firstName').trim().isLength({ min: 1, max: 20 }).withMessage('First Name must be between 1 and 20 characters'),
  body('lastName').trim().isLength({ min: 1, max: 20 }).withMessage('Last Name must be between 1 and 20 characters'),
  body('email').trim().isEmail().withMessage('Invalid email format').isLength({ max: 50 }).withMessage('Email must not exceed 50 characters'),
  body('password').isLength({ min: 6, max: 30 }).withMessage('Password must be between 6 and 30 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
];

export const registerUser_post = [
  ...registerUserValidators,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    try {
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: 'false', message: 'already-exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword,
      });

      if (newUser) {
        return res.status(201).json({ success: true, message: 'registered-successfully' });
      } else {
        return res.status(500).json({ success: false, message: 'failed-register-user' });
      }
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ success: false, message: 'failed-register-user' });
    }
  }),
];

const loginUserValidators = [
  body('email').trim().isEmail().withMessage('Invalid email format').isLength({ max: 50 }).withMessage('Email must not exceed 50 characters'),
  body('password').isLength({ min: 6, max: 30 }).withMessage('Password must be between 6 and 30 characters'),
];

export const loginUser_post = [
  ...loginUserValidators,
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid email or password.' });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

        return res.status(200).json({ success: true, message: 'Logged in successfully.', token });
      });
    })(req, res, next);
  })
];

export const profileUser_get = asyncHandler(async (req, res, next) => {
  const userId = req.user._id;

  try {
      const user = await User.findById(userId).select('-password');
      if (!user) {
          res.status(404);
          throw new Error('User not found');
      }

      res.json({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          creationDate: user.creationDate,
          isAdmin: user.isAdmin,
      });
  } catch (error) {
      next(error);
  }
});

export const auth_google_get = (req, res, next) => {
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};

export const auth_google_callback_get = asyncHandler((req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: 'No se pudo conectar' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
      res.redirect(`http://localhost:5173/?token=${token}`);
    });
  })(req, res, next);
});