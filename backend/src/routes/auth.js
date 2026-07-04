import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    // Duplicate check
    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
    }

    // Hash password with bcrypt (12 salt rounds — production grade)
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email: trimmedEmail, passwordHash });

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    console.log(`✅ [Auth] New user registered: ${trimmedEmail}`);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user._id, email: user.email, createdAt: user.createdAt },
    });
  })
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const trimmedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: trimmedEmail });

    // Use a constant-time comparison to avoid timing attacks
    if (!user) {
      // Constant-time dummy compare (bcrypt.compare is cheaper than hash on cold start)
      await bcrypt.compare('dummy_to_prevent_timing_attack', '$2a$12$dummyhashvaluethatisnotreal.abcdefghijklmnopqrstuvwx');
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    console.log(`✅ [Auth] User logged in: ${trimmedEmail}`);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user._id, email: user.email },
    });
  })
);

export default router;
