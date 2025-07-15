import Staff from "../models/Staff.js";
import BlockedUser from "../models/BlockedUser.js";
import sendEmail from "../utils/sendEmail.js";
import Counter from "../models/Counter.js"; // Import Counter model
import Notification from "../models/Notification.js";
import VisitorSignup from "../models/VisitorSignup.js";

// POST: Register staff
export const registerStaff = async (req, res) => {
  try {
    const { name, username, email, phone, password, role, faculty, department, nicNumber } = req.body;
    console.log("Received registration data:", { name, username, email, phone, role, faculty, department, nicNumber });

    // Validate required fields with default for role
    const safeRole = role?.trim() || "security";
    if (!name?.trim() || !username?.trim() || !email?.trim() || !password?.trim()) {
      console.error("Missing required fields:", { name, username, email, password });
      return res.status(400).json({ success: false, message: "Name, username, email, and password are required" });
    }

    // Email validation
    const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
    if (!emailRegex.test(email.trim())) {
      console.error("Invalid email format:", email);
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    // Define role-based prefixes
    const rolePrefixes = {
      admin: "VMSad",
      security: "VMSsec",
      host: "VMSho",
    };
    const prefix = rolePrefixes[safeRole.toLowerCase()] || "VMSsec"; // Default to security if role not recognized

    // Generate User ID using Counter
    let counter = await Counter.findOneAndUpdate(
      { name: `staff-${safeRole.toLowerCase()}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const seq = counter.seq.toString().padStart(4, "0"); // Pad with leading zeros to 4 digits
    const userID = `${prefix}-${seq}`;

    // Check for duplicates (username only, userID is now auto-generated)
    const usernameExists = await Staff.findOne({ username: { $regex: new RegExp(`^${username.trim()}$`, "i") } });
    if (usernameExists) {
      console.error("Duplicate username found:", username);
      return res.status(400).json({ success: false, message: "Username already taken" });
    }

    // Create new staff record in the db; password hashing and validation handled by the model
    const newStaff = await Staff.create({
      name: name.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone?.trim() || "",
      password: password.trim(),
      role: safeRole.toLowerCase(),
      userID, // Use the auto-generated User ID
      faculty: faculty?.trim() || "",
      department: department?.trim() || "",
      nicNumber: nicNumber?.trim() || "",
      status: "active",
      registeredDate: new Date(),
    });

    // Notify all admins
    const admins = await Staff.find({ role: "admin" });
    const notificationPromises = admins.map((admin) =>
      Notification.create({
        message: `${newStaff.name} - ${newStaff.userID} is registered as a ${newStaff.role}`,
        admin: admin._id,
      })
    );
    await Promise.all(notificationPromises);

    console.log("Staff saved successfully:", newStaff.userID);

    console.log("FRONTEND_URL in StaffController:", process.env.FRONTEND_URL || "Not defined, using fallback");
    // Use FRONTEND_URL
    const baseUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL !== "undefined" ? process.env.FRONTEND_URL : 'http://localhost:5173';
    const loginUrl = `${baseUrl}/login`;
    console.log("Generated loginUrl:", loginUrl);

    // Send confirmation email
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
            <li><strong>Password:</strong> ${password.trim()}</li>
          </ul>
          <p>Please use your username and the password above to log in to the system. For security, we recommend changing your password after your first login.</p>
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
      return res.status(400).json({
        success: false,
        message,
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
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// GET: Get staff by role
export const getStaffByRole = async (req, res) => {
  try {
    const role = req.params.role.toLowerCase();
    console.log("Fetching users for role:", role);

    const users = await Staff.find({ role });

    const cleanedUsers = users.map((user) => ({
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

// GET: Get blocked users (from BlockedUser collection)
export const getBlockedUsers = async (req, res) => {
  try {
    const blockedUsers = await BlockedUser.find();
    res.status(200).json(blockedUsers);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch blocked users", error: error.message });
  }
};

// POST: Block a registered user (create BlockedUser document)
export const blockUser = async (req, res) => {
  try {
    const { email, role, reason,} = req.body;
    if (!email || !role || !reason) {
      return res.status(400).json({ success: false, message: "Email, role, and reason are required" });
    }

    // Find user in Staff or VisitorSignup
    let user;
    if (["host", "security", "admin"].includes(role.toLowerCase())) {
      user = await Staff.findOne({ email: email.trim(), role: role.toLowerCase() });
      if (!user) return res.status(404).json({ success: false, message: "Staff member not found" });
    } else if (role.toLowerCase() === "visitor") {
      user = await VisitorSignup.findOne({ email: email.trim() });
      if (!user) return res.status(404).json({ success: false, message: "Visitor not found" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    // Prevent duplicate block
    const existingBlockedUser = await BlockedUser.findOne({ email: email.trim() });
    if (existingBlockedUser) {
      return res.status(400).json({ success: false, message: "User is already blocked" });
    }

    // Create BlockedUser document
    const blockedUser = await BlockedUser.create({
      name: user.name || `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: role.toLowerCase(),
      reason: reason,
    });

    // Update original user's status
    if (user instanceof Staff) {
      await Staff.findByIdAndUpdate(user._id, { status: "blocked" }, { new: true });
    } else if (user instanceof VisitorSignup) {
      await VisitorSignup.findByIdAndUpdate(user._id, { status: "blocked" }, { new: true });
    }

     res.status(200).json({ success: true, message: "User blocked successfully", data: blockedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to block user", error: error.message });
  }
};

// DELETE: Unblock a user (remove from BlockedUser and restore status)
export const unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const blockedUser = await BlockedUser.findById(id);
    if (!blockedUser) {
      return res.status(404).json({ success: false, message: "Blocked user not found" });
    }

    // Restore original user's status
    const staff = await Staff.findOne({ email: blockedUser.email });
    let updatedUser;
    if (staff) {
      updatedUser = await Staff.findByIdAndUpdate(staff._id, { status: "active" }, { new: true });
    } else {
      const visitor = await VisitorSignup.findOne({ email: blockedUser.email });
      if (!visitor) {
        return res.status(404).json({ success: false, message: "Original user not found" });
      }
      updatedUser = await VisitorSignup.findByIdAndUpdate(visitor._id, { status: "active" }, { new: true });
    }

    // Remove BlockedUser document
    await BlockedUser.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: "User unblocked successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to unblock user", error: error.message });
  }
};