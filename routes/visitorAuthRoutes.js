import express from "express";
import { signupVisitor } from "../controllers/VisitorSignupController.js";
import { 
  loginVisitor,  
  forgotPassword, 
  resetPassword,
  verifyToken
} from "../controllers/AuthController.js";

import bcrypt from 'bcrypt';
import VisitorSignup from "../models/VisitorSignup.js"; // You need to import your model to use it here

const router = express.Router();

// POST /api/auth/visitor/signup
router.post("/signup", signupVisitor);

// POST /api/auth/visitor/login
router.post("/login", loginVisitor);

// POST /api/auth/visitor/forgot-password
router.post("/forgot-password", forgotPassword);

// POST /api/auth/visitor/reset-password
router.post("/reset-password", resetPassword);

// POST /api/auth/visitor/test-hash (for testing password hashing and matching)
router.post('/test-hash', async (req, res) => {
  const { password } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const match = await bcrypt.compare(password, hash);

    res.json({ hash, match });
  } catch (error) {
    res.status(500).json({ message: 'Error hashing password', error });
  }
});

// POST /api/auth/visitor/test-password (NEW: for testing password matching from DB)
router.post('/test-password', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await VisitorSignup.findOne({ username })
      .select('+password'); // select password field explicitly if schema has select: false

    if (!user) return res.json({ error: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    res.json({
      userFound: true,
      passwordMatch: isMatch,
      storedHash: user.password.substring(0, 10) + '...' // Partial hash for checking
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/visitor/verify
router.get("/verify", verifyToken);

export default router;
