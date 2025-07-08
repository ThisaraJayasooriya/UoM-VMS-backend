import express from "express";
import {
  registerStaff,
  getStaffByRole,
  updateStaff,
  deleteStaff,
} from "../controllers/staffController.js";

const router = express.Router();

// POST: Register staff
router.post("/register", registerStaff);

// GET: Get staff by role
router.get("/:role", getStaffByRole);

// PUT: Update staff
router.put("/:id", updateStaff);

// DELETE: Delete staff
router.delete("/:id", deleteStaff);

export default router;
