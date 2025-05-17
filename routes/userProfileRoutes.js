import express from "express";
import { getProfileData } from "../controllers/userProfileController.js";

const router = express.Router();

router.get("/:userId", getProfileData);

export default router;