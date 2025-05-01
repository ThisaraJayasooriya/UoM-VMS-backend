import Staff from "../models/Staff.js";

// POST: Register staff
export const registerStaff = async (req, res) => {
  try {
    console.log("Incoming staff data:", req.body);
    const newStaff = new Staff({
      ...req.body,
      role: req.body.role.toLowerCase(),
    });
    await newStaff.save();
    res.status(201).json({ message: "Staff registered successfully" });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Failed to register staff", error });
  }
};

// GET: Get staff by role
export const getStaffByRole = async (req, res) => {
  try {
    const role = req.params.role.toLowerCase();
    console.log("Fetching users for role:", role);

    const users = await Staff.find({ role });

    // Fix: fill missing optional fields safely
    const cleanedUsers = users.map(user => ({
      ...user._doc,
      faculty: user.faculty || "",
      department: user.department || "",
      nicNumber: user.nicNumber || "",
    }));

    res.status(200).json(cleanedUsers);
  } catch (error) {
    console.error("Fetch error:", error.message);
    res.status(500).json({ message: "Failed to fetch staff", error });
  }
};

// PUT: Update staff
export const updateStaff = async (req, res) => {
  try {
    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "Staff updated successfully", updated });
  } catch (error) {
    console.error("Update error:", error.message);
    res.status(500).json({ message: "Failed to update staff", error });
  }
};

// DELETE: Delete staff
export const deleteStaff = async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error.message);
    res.status(500).json({ message: "Failed to delete staff", error });
  }
};
