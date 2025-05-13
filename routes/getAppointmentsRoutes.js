import express from "express";
import { getPendingAppointments } from "../controllers/getAppointmentsController.js";

const router = express.Router();

// GET /api/appointments/host/:hostId/pending
router.get("/host/:hostId/pending", getPendingAppointments);

export default router;
