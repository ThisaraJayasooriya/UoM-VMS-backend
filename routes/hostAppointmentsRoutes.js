import express from "express";
import { getPendingAppointments, updateAppointmentStatus } from "../controllers/hostAppointmentsController.js";

const router = express.Router();

// GET /api/appointments/host/:hostId/pending
router.get("/host/:hostId/pending", getPendingAppointments);

 // PUT /api/appointments/status/:id
router.put("/status/:id", updateAppointmentStatus);

export default router;
