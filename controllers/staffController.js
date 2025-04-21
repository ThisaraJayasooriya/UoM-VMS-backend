// controllers/staffController.js
import Staff from "../models/Staff.js";

// POST: Register staff
export const registerStaff = async (req, res) => {
  try {
    const newStaff = new Staff(req.body);
    await newStaff.save();
    res.status(201).json({ message: "Staff registered successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to register staff", error });
  }
};

// GET: Get staff by role
export const getStaffByRole = async (req, res) => {
  try {
    const role = req.params.role;
    const users = await Staff.find({ role });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch staff", error });
  }
};

// PUT: Update staff member by ID
export const updateStaff = async (req, res) => {
  try {
    const updated = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ message: "Staff updated successfully", updated });
  } catch (error) {
    res.status(500).json({ message: "Failed to update staff", error });
  }
};

// DELETE: Delete staff member by ID
export const deleteStaff = async (req, res) => {
  try {
    await Staff.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Staff deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete staff", error });
  }
};
