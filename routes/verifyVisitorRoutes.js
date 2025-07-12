import express from "express";
import { searchVisitor, checkInVisitor, checkOutVisitor, getRecentActivities } from "../controllers/VerifyVisitorController.js";

const router = express.Router();

// Routes
router.get("/search", searchVisitor); // Search visitor by visitorId or NIC
router.patch("/:appointmentId/checkin", checkInVisitor); // Check-in visitor
router.patch("/:appointmentId/checkout", checkOutVisitor); // Check-out visitor
router.get("/activities", getRecentActivities); // Get recent activities

export default router;