import express from "express";
import { searchVisitor, checkInVisitor, checkOutVisitor, getRecentActivities } from "../controllers/VerifyVisitorController.js";

const router = express.Router();

// Routes
router.get("/search",searchVisitor);
router.patch("/:appointmentId/checkin", checkInVisitor); 
router.patch("/:appointmentId/checkout", checkOutVisitor); 
router.get("/activities", getRecentActivities); 


export default router;