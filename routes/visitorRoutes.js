import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import VisitorSignup from "../models/VisitorSignup.js";
import fs from "fs";

// Read the JSON file synchronously
const disposableDomains = JSON.parse(
  fs.readFileSync("node_modules/disposable-email-domains/index.json", "utf8")
);

const router = express.Router();

// Visitor Sign-Up
router.post("/signup", async (req, res) => {
  const { firstName, lastName, email, phoneNumber, password, username, nicNumber } = req.body;

  // Check for missing fields
  if (!firstName || !lastName || !email || !phoneNumber || !password || !username || !nicNumber) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check for existing email or NIC or username
    const emailExists = await VisitorSignup.findOne({ email });
    const nicNumberExists = await VisitorSignup.findOne({ nicNumber });
    const usernameExists = await VisitorSignup.findOne({ username });

    // Extract and clean email domain
    const emailDomain = email.split("@")[1];
    const cleanedDomain = emailDomain.trim().toLowerCase();

    // Debug logs
    console.log("Email domain:", emailDomain);
    console.log("Cleaned domain:", cleanedDomain);
    console.log("Is domain in disposableDomains?", disposableDomains.includes(cleanedDomain));
    console.log("Sample disposable domains:", disposableDomains.slice(0, 5));

    // Check if email domain is disposable
    if (disposableDomains.includes(cleanedDomain)) {
      return res.status(400).json({ message: "Disposable email addresses are not allowed." });
    }

    if (emailExists || nicNumberExists || usernameExists) {
      return res.status(400).json({
        message: "Email, NIC, or Username already registered",
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create visitor
    const newVisitor = await VisitorSignup.create({
      firstName,
      lastName,
      email,
      phoneNumber,
      username,
      nicNumber,
      password: hashedPassword,
    });

    // Generate JWT
    const token = jwt.sign({ id: newVisitor._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Visitor registered successfully",
      visitor: {
        id: newVisitor._id,
        name: `${newVisitor.firstName} ${newVisitor.lastName}`,
        username: newVisitor.username,
        email: newVisitor.email,
      },
      token,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
