// routes/staffRoutes.js
import express from "express";
import {
  registerStaff,
  getStaffByRole,
  updateStaff,
  deleteStaff,
} from "../controllers/staffController.js";

const router = express.Router();

// POST: Register a new staff member
router.post("/register", registerStaff);

// GET: Get staff by role (e.g., host, admin, security)
router.get("/:role", getStaffByRole);

// PUT: Update staff member by ID
router.put("/:id", updateStaff);

// DELETE: Delete staff member by ID
router.delete("/:id", deleteStaff);

export default router;
