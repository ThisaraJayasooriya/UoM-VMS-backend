import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import VisitorSignup from "../models/VisitorSignup.js";
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

// Visitor Login Controller
export const loginVisitor = async (req, res) => {
  const { username, password, rememberMe } = req.body;

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
    console.log("Entered Password:", password);
    console.log("Stored Hashed Password:", visitor.password);

    // Check account status if exists
    if (visitor.status && visitor.status.toLowerCase() !== "active") {
      return errorResponse(res, 403, "Account is not active. Please contact support.");
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, visitor.password);
    console.log("Password Match:", isMatch);

    if (!isMatch) {
      return errorResponse(res, 401, "Invalid credentials");
    }

    // Enhanced token generation with rememberMe
    const token = jwt.sign(
      {
        id: visitor._id,
        role: "visitor",
        rememberMe: Boolean(rememberMe),
      },
      process.env.JWT_SECRET,
      { expiresIn: rememberMe ? "30d" : "1h" }
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
    return errorResponse(res, 400, "Email or phone number is required");
  }

  try {
    const isEmail = contact.includes("@");
    const query = isEmail
      ? { email: { $regex: new RegExp(`^${contact.trim()}$`, "i") } }
      : { phoneNumber: contact.trim() };

    const visitor = await VisitorSignup.findOne(query);
    if (!visitor) {
      return res.status(200).json({
        success: true,
        message: "If an account exists, a reset link has been sent.",
      });
    }

    const resetToken = jwt.sign({ id: visitor._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    visitor.resetPasswordToken = resetToken;
    visitor.resetPasswordExpires = Date.now() + 3600000;
    await visitor.save();

    if (isEmail) {
      if (!process.env.FRONTEND_URL) {
        throw new Error("FRONTEND_URL is not defined in the environment variables");
      }
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: visitor.email,
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
      console.log(`Password reset token for ${visitor.phoneNumber}: ${resetToken}`);
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

    const visitor = await VisitorSignup.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!visitor) {
      return errorResponse(res, 400, "Invalid or expired token");
    }

    console.log("Received newPassword:", newPassword);

    const salt = await bcrypt.genSalt(10);
    visitor.password = await bcrypt.hash(newPassword, salt);
    visitor.skipPasswordHash = true; // Bypass pre-save hook
    visitor.resetPasswordToken = undefined;
    visitor.resetPasswordExpires = undefined;
    await visitor.save();

    // Generate new token for automatic login
    const newToken = jwt.sign(
      {
        id: visitor._id,
        role: "visitor",
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
      rememberMe: decoded.rememberMe || false,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return errorResponse(res, 401, "Invalid or expired token", error);
  }
};