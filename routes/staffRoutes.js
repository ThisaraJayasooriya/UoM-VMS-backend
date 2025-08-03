import express from "express";
import {
  registerStaff,
  getStaffByRole,
  updateStaff,
  deleteStaff,
  getBlockedUsers,
  blockUser,
  unblockUser,
} from "../controllers/staffController.js";

const router = express.Router();

// POST: Register staff
router.post("/register", registerStaff);


// GET: Get blocked users
router.get("/blocked", getBlockedUsers);

// POST: Block a user
router.post("/block", blockUser);

// DELETE: Unblock a user
router.delete("/blocked/:id", unblockUser);

// GET: Get staff by role
router.get("/:role", getStaffByRole);

// PUT: Update staff
router.put("/:id", updateStaff);

// DELETE: Delete staff
router.delete("/:id", deleteStaff);

export default router;