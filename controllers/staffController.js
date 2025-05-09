import Staff from "../models/Staff.js";
import sendEmail from "../utils/sendEmail.js";

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

    // Check for duplicates (removed nicNumber check)
    const [usernameExists, userIDExists] = await Promise.all([
      Staff.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, "i") } }),
      Staff.findOne({ userID: { $regex: new RegExp(`^${userID.trim()}$`, "i") } }),
    ]);

    if (usernameExists) {
      console.error("Duplicate username found:", username);
      return res.status(400).json({ success: false, message: "Username already taken" });
    }
    if (userIDExists) {
      console.error("Duplicate userID found:", userID);
      return res.status(400).json({ success: false, message: "UserID already taken" });
    }

    // Create new staff; password hashing and validation handled by the model
    const newStaff = await Staff.create({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone?.trim() || "",
      password: password.trim(), // Pass plain password; model will hash it
      role: safeRole.toLowerCase(),
      userID: userID.trim(),
      faculty: faculty?.trim() || "",
      department: department?.trim() || "",
      nicNumber: nicNumber?.trim() || "",
      status: "active",
      registeredDate: new Date(),
    });

    console.log("Staff saved successfully:", newStaff.userID);

    // Debug log to check FRONTEND_URL
    console.log("FRONTEND_URL in StaffController:", process.env.FRONTEND_URL || "Not defined, using fallback");

    // Use FRONTEND_URL instead of CLIENT_URL
    const baseUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== "undefined" ? process.env.FRONTEND_URL : 'http://localhost:5173';
    const loginUrl = `${baseUrl}/login`;
    console.log("Generated loginUrl:", loginUrl);

    // Send confirmation email without including the password
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
          </ul>
          <p>Please use your username and the password you set to log in to the system.</p>
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

    return res.status(201).json({
      success: true,
      message: "Staff registered successfully",
      data: {
        staff: {
          id: newStaff._id,
          userID: newStaff.userID,
          name: newStaff.name,
          username: newStaff.username,
          email: newStaff.email,
          role: newStaff.role,
        },
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = "Duplicate field error";
      if (field === "username") message = "Username already taken";
      if (field === "userID") message = "UserID already taken";
      
      return res.status(400).json({ 
        success: false,
        message 
      });
    }

    // Handle validation errors (e.g., password format)
    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)[0].message;
      return res.status(400).json({ success: false, message });
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