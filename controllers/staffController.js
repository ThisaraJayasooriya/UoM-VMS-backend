import Staff from "../models/Staff.js";
import sendEmail from "../utils/sendEmail.js";
import bcrypt from "bcrypt";

// Password strength validator
const validatePassword = (password) => {
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  const result = strongPasswordRegex.test(password);
  if (!result) {
    console.log("Password validation failed:", {
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[\W_]/.test(password),
      length: password.length >= 8,
    });
  }
  return result;
};

// POST: Register staff
export const registerStaff = async (req, res) => {
  try {
    const { name, username, email, phone, password, role, userID, faculty, department, nicNumber } = req.body;

    console.log("Received registration data:", { name, username, email, phone, role, userID, faculty, department, nicNumber });

    // Validate required fields with default for role
    const safeRole = role?.trim() || "security"; // Default to "security" if undefined
    if (!name?.trim() || !username?.trim() || !email?.trim() || !password?.trim() || !userID?.trim()) {
      console.error("Missing required fields:", { name, username, email, password, userID });
      return res.status(400).json({ success: false, message: "Name, username, email, password, and userID are required" });
    }

    // Email validation
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email.trim())) {
      console.error("Invalid email format:", email);
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Validate password strength
    if (!validatePassword(password)) {
      console.error("Invalid password:", password);
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.",
      });
    }

    // Check for duplicates
    const existingStaff = await Staff.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${username.trim()}$`, "i") } },
        { email: { $regex: new RegExp(`^${email.trim()}$`, "i") }, role: safeRole.toLowerCase() },
      ].filter(Boolean),
    });

    if (existingStaff) {
      const conflictField = existingStaff.username?.toLowerCase() === username.trim().toLowerCase() ? "Username"
        : (existingStaff.email?.toLowerCase() === email.trim().toLowerCase() && existingStaff.role === safeRole.toLowerCase()) ? "Email for this role"
        : "Unknown field";
      console.error(`Duplicate ${conflictField} found for:`, { username, email, role: safeRole });
      return res.status(400).json({ success: false, message: `${conflictField} already exists` });
    }

    // Hash the password (already handled by schema pre-save hook, but keeping for clarity)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    // Create new staff with hashed password
    const newStaff = new Staff({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone?.trim() || "",
      password: hashedPassword,
      role: safeRole.toLowerCase(),
      userID: userID.trim(),
      faculty: faculty?.trim() || "",
      department: department?.trim() || "",
      nicNumber: nicNumber?.trim() || "",
      status: "active",
      registeredDate: new Date(),
    });

    await newStaff.save();
    console.log("Staff saved successfully:", newStaff.userID);

    // Send confirmation email with password and userID in the login link
    const loginUrl = `${process.env.CLIENT_URL}/login`;
    const emailResult = await sendEmail({
      to: newStaff.email,
      subject: "Welcome to UoM Visitor Management System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #124E66;">Welcome, ${newStaff.name}!</h2>
          <p>Thank you for joining the University of Moratuwa Visitor Management System as a ${newStaff.role}.</p>
          <p>Your account has been successfully created with the following details:</p>
          <ul style="list-style: none; padding: 0;">
            <li><strong>User ID:</strong> ${newStaff.userID}</li>
            <li><strong>Username:</strong> ${newStaff.username}</li>
            <li><strong>Role:</strong> ${newStaff.role.charAt(0).toUpperCase() + newStaff.role.slice(1)}</li>
            <li><strong>Email:</strong> ${newStaff.email}</li>
            <li><strong>Password:</strong> ${password}</li>
          </ul>
          <p>Please use your User ID and password to log in to the system.</p>
          <p style="margin-top: 20px;">
            <a href="${loginUrl}" style="background-color: #124E66; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In Now</a>
          </p>
          <p style="font-size: 12px; color: #748D92; margin-top: 20px;">
            If you did not request this account, please contact our support team at support@uom.lk.
          </p>
          <p style="font-size: 12px; color: #748D92;">
            © ${new Date().getFullYear()} University of Moratuwa. All rights reserved.
          </p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.warn(`Failed to send email to ${newStaff.email}: ${emailResult.error}`);
      return res.status(201).json({
        success: true,
        message: "Staff registered successfully, but failed to send confirmation email",
      });
    }

    res.status(201).json({ success: true, message: "Staff registered successfully" });
  } catch (error) {
    console.error("Register error:", error.message, "Stack:", error.stack);
    res.status(500).json({ success: false, message: "Failed to register staff", error: error.message });
  }
};

// GET: Get staff by role
export const getStaffByRole = async (req, res) => {
  try {
    const role = req.params.role.toLowerCase();
    console.log("Fetching users for role:", role);

    const users = await Staff.find({ role });

    const cleanedUsers = users.map(user => ({
      ...user._doc,
      faculty: user.faculty || "",
      department: user.department || "",
      nicNumber: user.nicNumber || "",
      username: user.username || "",
    }));

    res.status(200).json(cleanedUsers);
  } catch (error) {
    console.error("Fetch error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch staff", error: error.message });
  }
};

// PUT: Update staff
export const updateStaff = async (req, res) => {
  try {
    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, message: "Staff updated successfully", updated });
  } catch (error) {
    console.error("Update error:", error.message);
    res.status(500).json({ success: false, message: "Failed to update staff", error: error.message });
  }
};

// DELETE: Delete staff
export const deleteStaff = async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Staff deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({ success: false, message: "Failed to delete staff", error: error.message });
  }
};