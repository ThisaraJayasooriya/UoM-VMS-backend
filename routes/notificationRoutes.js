import express from "express";
import {
  getAllNotifications,
  updateNotification,
  deleteNotification,
} from "../controllers/NotificationController.js";
import { getLatestNotifications } from "../controllers/NotificationController.js";

const router = express.Router();

router.get("/all", getAllNotifications);
router.get("/latest", getLatestNotifications); 
router.put("/:id", updateNotification);
router.delete("/:id", deleteNotification);
router.get("/latest", getLatestNotifications);

export default router;
