import express from "express";
import { signupVisitor } from "../controllers/VisitorSignupController.js";

const router = express.Router();

router.post("/signup", signupVisitor);

export default router;
