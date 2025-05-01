import express from "express";
import {
  registerStaff,
  getStaffByRole,
  updateStaff,
  deleteStaff,
} from "../controllers/staffController.js";

const router = express.Router();

router.post("/register", registerStaff);
router.get("/:role", getStaffByRole);
router.put("/:id", updateStaff);
router.delete("/:id", deleteStaff);

export default router;
