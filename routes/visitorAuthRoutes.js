import express from "express";
import { signupVisitor } from "../controllers/VisitorSignupController.js";
import { 
  loginVisitor, 
  forgotPassword, 
  resetPassword, 
  verifyToken 
} from "../controllers/AuthController.js";
import bcrypt from "bcrypt";
import VisitorSignup from "../models/VisitorSignup.js";

const router = express.Router();

// Visitor Authentication Routes
router.post("/signup", signupVisitor);
router.post("/login", loginVisitor);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/verify", verifyToken);

// Log all registered routes for debugging
router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`Route registered: ${r.route.path} [${Object.keys(r.route.methods).join(", ").toUpperCase()}]`);
  }
});

// Development/testing routes (removed for production but commented for reference)
/*
router.post("/test-hash", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    
    const hash = await bcrypt.hash(password, 10);
    const match = await bcrypt.compare(password, hash);
    
    res.json({ 
      success: true,
      hash: hash.substring(0, 15) + "...",
      match 
    });
  } catch (error) {
    console.error("Hashing error:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
});
*/

export default router;