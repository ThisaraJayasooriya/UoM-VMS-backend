import express from "express";
import { getConfirmedAppointments, getPendingAppointments, updateAppointmentStatus } from "../controllers/hostAppointmentsController.js";

const router = express.Router();

router.get("/host/:hostId/pending", getPendingAppointments);

router.put("/status/:id", updateAppointmentStatus);

router.get("/host/:hostId/confirmed", getConfirmedAppointments);

export default router;
