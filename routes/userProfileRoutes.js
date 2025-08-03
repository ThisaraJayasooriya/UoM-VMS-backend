import express from "express";
import { getProfileData, updateProfileData } from "../controllers/userProfileController.js";

const router = express.Router();

router.get("/:userId", getProfileData);
router.put("/:userId", updateProfileData);

export default router;