import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import VisitorSignup from "../models/VisitorSignup.js";

// Utility function for consistent error responses
const errorResponse = (res, status, message, error = null) => {
  const response = {
    success: false,
    message,
  };

  if (error && process.env.NODE_ENV === "development") {
    response.error = error.message;
    response.stack = error.stack;
  }

  return res.status(status).json(response);
};

// Enhanced password validation
const validatePassword = (password) => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return strongPasswordRegex.test(password);
};

// Visitor Login Controller
export const loginVisitor = async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username?.trim() || !password?.trim()) {
    return errorResponse(res, 400, "Username and password are required");
  }

  try {
    // Case-insensitive search with trimmed username
    const visitor = await VisitorSignup.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
    }).select("+password +status");

    if (!visitor) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Log the entered password and stored hashed password for debugging
    console.log("Entered Password:", password);  // Log entered password
    console.log("Stored Hashed Password:", visitor.password);  // Log the hashed password from DB

    // Check account status if exists
    if (visitor.status && visitor.status.toLowerCase() !== "active") {
      return errorResponse(res, 403, "Account is not active. Please contact support.");
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, visitor.password);
    console.log("Password Match:", isMatch);  // Check if passwords match

    if (!isMatch) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: visitor._id,
        role: "visitor",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Omit sensitive data in response
    const visitorData = {
      id: visitor._id,
      visitorId: visitor.visitorId,
      name: `${visitor.firstName} ${visitor.lastName}`,
      username: visitor.username,
      email: visitor.email,
      nationality: visitor.nationality,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      visitor: visitorData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Password Reset Token Generation
const generateResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Forgot Password Controller
export const forgotPassword = async (req, res) => {
  const { username } = req.body;

  if (!username?.trim()) {
    return errorResponse(res, 400, "Username or email is required");
  }

  try {
    const visitor = await VisitorSignup.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
        { email: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
      ],
    });

    // Generic response for security (don't reveal if user exists)
    if (!visitor) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    // Generate and save reset token
    const resetToken = generateResetToken();
    visitor.resetToken = resetToken;
    visitor.resetTokenExpiry = Date.now() + 3600000; // 1 hour expiration
    await visitor.save();

    // In production, you would send an email here
    console.log(`Password reset token for ${visitor.email}: ${resetToken}`);

    return res.status(200).json({
      success: true,
      message: "Password reset link sent successfully.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Reset Password Controller
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword?.trim()) {
    return errorResponse(res, 400, "Token and new password are required");
  }

  // Validate password strength
  if (!validatePassword(newPassword)) {
    return errorResponse(
      res,
      400,
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    );
  }

  try {
    const visitor = await VisitorSignup.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!visitor) {
      return errorResponse(res, 400, "Invalid or expired token");
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    visitor.password = await bcrypt.hash(newPassword, salt);
    visitor.resetToken = undefined;
    visitor.resetTokenExpiry = undefined;
    await visitor.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return errorResponse(res, 500, "Password reset failed", error);
  }
};

// Token Verification Controller
export const verifyToken = async (req, res) => {
  const authHeader = req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return errorResponse(res, 401, "No token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const visitor = await VisitorSignup.findById(decoded.id).select("-password");

    if (!visitor) {
      return errorResponse(res, 404, "Visitor not found");
    }

    return res.status(200).json({
      success: true,
      visitor: {
        id: visitor._id,
        visitorId: visitor.visitorId,
        name: `${visitor.firstName} ${visitor.lastName}`,
        username: visitor.username,
        email: visitor.email,
        nationality: visitor.nationality,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return errorResponse(res, 401, "Invalid or expired token", error);
  }
};
