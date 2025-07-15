import express from "express";
import { searchVisitor, checkInVisitor, checkOutVisitor } from "../controllers/VerifyVisitorController.js";

const router = express.Router();

// Routes
router.get("/search", searchVisitor); // Search visitor by visitorId or NIC
router.patch("/:visitorId/checkin", checkInVisitor); // Check-in visitor
router.patch("/:visitorId/checkout", checkOutVisitor); // Check-out visitor

export default router;