import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import { nanoid } from "nanoid";
import VisitorSignup from "../models/VisitorSignup.js";
import Notification from "../models/Notification.js"; 
import Staff from "../models/Staff.js"; 

// Read disposable email domains
const disposableDomains = JSON.parse(
  fs.readFileSync("node_modules/disposable-email-domains/index.json", "utf8")
);

// Visitor Signup Controller
export const signupVisitor = async (req, res) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phoneNumber, 
    password, 
    username, 
    nationality,
    nicNumber,
    passportNumber 
  } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !phoneNumber || !password || !username || !nationality) {
    return res.status(400).json({ 
      success: false,
      message: "All required fields must be provided" 
    });
  }

  // Validate identification based on nationality
  if (nationality === "Sri Lankan" && !nicNumber) {
    return res.status(400).json({ 
      success: false,
      message: "NIC number is required for Sri Lankan nationals" 
    });
  }
  if (nationality === "Foreigner" && !passportNumber) {
    return res.status(400).json({ 
      success: false,
      message: "Passport number is required for foreigners" 
    });
  }

  try {
    // Check for existing records
    const [emailExists, usernameExists] = await Promise.all([ 
      VisitorSignup.findOne({ email }),
      VisitorSignup.findOne({ username })
    ]);

    // Check for existing NIC or Passport (only for non-null values)
    const idExists = nationality === "Sri Lankan" 
      ? nicNumber && await VisitorSignup.findOne({ nicNumber })
      : passportNumber && await VisitorSignup.findOne({ passportNumber });

    // Check disposable email
    const emailDomain = email.split("@")[1]?.trim().toLowerCase();
    if (emailDomain && disposableDomains.includes(emailDomain)) {
      return res.status(400).json({ 
        success: false,
        message: "Disposable email addresses are not allowed." 
      });
    }

    // Check for existing records
    if (emailExists) {
      return res.status(400).json({ 
        success: false,
        message: "Email already registered" 
      });
    }
    if (usernameExists) {
      return res.status(400).json({ 
        success: false,
        message: "Username already taken" 
      });
    }
    if (idExists) {
      return res.status(400).json({ 
        success: false,
        message: nationality === "Sri Lankan" 
          ? "NIC number already registered" 
          : "Passport number already registered" 
      });
    }

    // Validate password strength
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10); // Consistent salt rounds
    
    const hashedPassword = await bcrypt.hash(password, 10); // Ensure salt rounds match

    // Generate visitor ID
    const visitorId = `VMS-${nanoid(6)}`;

    // Create new visitor
    const newVisitor = await VisitorSignup.create({
      visitorId,
      firstName,
      lastName,
      email,
      phoneNumber,
      username,
      nationality,
      nicNumber: nationality === "Sri Lankan" ? nicNumber : undefined,
      passportNumber: nationality === "Foreigner" ? passportNumber : undefined,
      password, // Let the model handle the hashing
    });

// ...existing code...
const admins = await Staff.find({ role: "admin" }); // Fetch all admins

const notificationPromises = admins.map((admin) =>
  Notification.create({
    message: `${newVisitor.firstName} ${newVisitor.lastName} - ${newVisitor.visitorId} is registered as a visitor`,
    admin: admin._id, // Assign notification to each admin
    read: false,
    timestamp: Date.now(),
  })
);

await Promise.all(notificationPromises);
// ...existing code...


    // Generate JWT token
    const token = jwt.sign({ id: newVisitor._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Return success response
    return res.status(201).json({
      success: true,
      message: "Visitor registered successfully",
      data: {
        visitor: {
          id: newVisitor._id,
          visitorId: newVisitor.visitorId,
          name: `${newVisitor.firstName} ${newVisitor.lastName}`,
          username: newVisitor.username,
          email: newVisitor.email,
          nationality: newVisitor.nationality,
        },
        token
      }
    });

  } catch (error) {
    console.error("Signup error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = "Duplicate field error";
      if (field === "nicNumber") message = "NIC number already exists";
      if (field === "passportNumber") message = "Passport number already exists";
      if (field === "email") message = "Email already registered";
      if (field === "username") message = "Username already taken";
      
      return res.status(400).json({ 
        success: false,
        message 
      });
    }

    // Handle other errors
    return res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined
    });
  }
};
