import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import VisitorSignup from "../models/VisitorSignup.js";
import Staff from "../models/Staff.js"; // Import Staff model
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

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

// Configure Nodemailer for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Unified Login Controller
export const login = async (req, res) => {
  const { username, password, rememberMe } = req.body;

  // Validate input
  if (!username?.trim() || !password?.trim()) {
    return errorResponse(res, 400, "Username and password are required");
  }

  try {
    // Check VisitorSignup collection
    let user = await VisitorSignup.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
    }).select("+password +status");

    let userType = "visitor";
    let role = "visitor";
    let userData = null;

    if (!user) {
      // Check Staff collection
      user = await Staff.findOne({
        username: { $regex: new RegExp(`^${username.trim()}$`, "i") },
      }).select("+password +status");

      if (user) {
        userType = "staff";
        role = user.role || "staff";
      }
    }
    //newnewnew
    // For staff, check if blocked
    if (userType === "staff") {
      if (user.status && user.status.toLowerCase() === "blocked") {
        return errorResponse(res, 403, "Your account is blocked. Please contact admin.");
      }
    }
    //newnewnew
    if (!user) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Validate password (both visitor and staff passwords are now hashed)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // For visitors, check account status
    if (userType === "visitor") {

  if (user.status && user.status.toLowerCase() === "blocked") {
    return errorResponse(res, 403, "Your account is blocked. Please contact admin.");
  }

  // 🟡 Then check for any other non-active states
  if (user.status && user.status.toLowerCase() !== "active") {
    return errorResponse(res, 403, "Account is not active. Please contact support.");
  }

    }

    // Prepare user data
    if (userType === "visitor") {
      userData = {
        id: user._id,
        visitorId: user.visitorId,
        name: `${user.firstName} ${user.lastName}`,
        username: user.username,
        email: user.email,
        nationality: user.nationality,
      };
    } else {
      userData = {
        id: user._id,
        userID: user.userID,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
      };
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        userType,
        role,
        rememberMe: Boolean(rememberMe),
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? "30d" : "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
      userType,
      role,
      redirect: userType === "visitor" ? "/visitor" : `/staff/${role}`,
      rememberMe: Boolean(rememberMe),
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Forgot Password Controller
export const forgotPassword = async (req, res) => {
  const { contact } = req.body;

  if (!contact?.trim()) {
    return errorResponse(res, 400, "Email address is required");
  }

  try {
    const isEmail = contact.includes("@");
    let user;
    let userType = "visitor";

    // Check VisitorSignup
    if (isEmail) {
      user = await VisitorSignup.findOne({
        email: { $regex: new RegExp(`^${contact.trim()}$`, "i") },
      });
    } else {
      user = await VisitorSignup.findOne({ phoneNumber: contact.trim() });
    }

    // Check Staff if no visitor found
    if (!user) {
      if (isEmail) {
        user = await Staff.findOne({
          email: { $regex: new RegExp(`^${contact.trim()}$`, "i") },
        });
        userType = "staff";
      } else {
        user = await Staff.findOne({ phone: contact.trim() });
        userType = "staff";
      }
    }

    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const resetToken = jwt.sign({ id: user._id, userType }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    if (isEmail) {
      if (!process.env.FRONTEND_URL) {
        throw new Error("FRONTEND_URL is not defined in the environment variables");
      }
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "Password Reset Request - University of Moratuwa",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your University of Moratuwa, Visitor Management System account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, please ignore this email.</p>
        `,
      };

      await transporter.sendMail(mailOptions);
      return res.status(200).json({
        success: true,
        message: "Password reset link sent to your email",
      });
    } else {
      console.log(`Password reset token for ${user.phoneNumber || user.phone}: ${resetToken}`);
      return res.status(200).json({
        success: true,
        message: "Password reset instructions will be sent to your phone number",
      });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return errorResponse(res, 500, "Internal server error", error);
  }
};

// Reset Password Controller
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword?.trim()) {
    return errorResponse(res, 400, "Token and new password are required");
  }

  if (!validatePassword(newPassword)) {
    return errorResponse(
      res,
      400,
      "Password must be at least 8 characters with uppercase, lowercase, number, and special character"
    );
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return errorResponse(res, 400, "Invalid or expired token");
    }

    let user;
    if (decoded.userType === "visitor") {
      user = await VisitorSignup.findOne({
        _id: decoded.id,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (user) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.skipPasswordHash = true; // Bypass pre-save hook
      }
    } else {
      user = await Staff.findOne({
        _id: decoded.id,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (user) {
        const salt = await bcrypt.genSalt(10); // Hash staff passwords as well
        user.password = await bcrypt.hash(newPassword, salt);
        user.skipPasswordHash = true; // Bypass pre-save hook
      }
    }

    if (!user) {
      return errorResponse(res, 400, "Invalid or expired token");
    }

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const newToken = jwt.sign(
      {
        id: user._id,
        userType: decoded.userType,
        role: decoded.userType === "visitor" ? "visitor" : user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
      token: newToken,
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
    let user;
    let userData;

    if (decoded.userType === "visitor") {
      user = await VisitorSignup.findById(decoded.id).select("-password");
      if (user) {
        userData = {
          id: user._id,
          visitorId: user.visitorId,
          name: `${user.firstName} ${user.lastName}`,
          username: user.username,
          email: user.email,
          nationality: user.nationality,
        };
      }
    } else {
      user = await Staff.findById(decoded.id).select("-password");
      if (user) {
        userData = {
          id: user._id,
          userID: user.userID,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        };
      }
    }

    if (!user) {
      return errorResponse(res, 404, `${decoded.userType} not found`);
    }

    return res.status(200).json({
      success: true,
      user: userData,
      userType: decoded.userType,
      role: decoded.role,
      rememberMe: decoded.rememberMe || false,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return errorResponse(res, 401, "Invalid or expired token", error);
  }
};