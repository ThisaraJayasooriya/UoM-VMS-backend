import express from "express";
import { signupVisitor } from "../controllers/VisitorSignupController.js";
import { getVisitors, updateVisitor, deleteVisitor } from "../controllers/VisitorController.js";
import { verifyToken } from "../controllers/AuthController.js";

const router = express.Router();

// Fetch all visitors
router.get("/", getVisitors);

// Add a new visitor (using signupVisitor)
router.post("/", signupVisitor);

// Update a visitor
router.put("/:id", updateVisitor);

// Delete a visitor
router.delete("/:id", deleteVisitor);

export default router;