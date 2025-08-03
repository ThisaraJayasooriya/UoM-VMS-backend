import express from "express";
const router = express.Router();
import { 
    addAvailability, 
    getAvailability, 
    deleteSlot, 
     
} from "../controllers/hostController.js";

// Routes
router.post("/add-availability", addAvailability);
router.get("/:hostId", getAvailability);
router.delete("/:availabilityId", deleteSlot);

export default router;