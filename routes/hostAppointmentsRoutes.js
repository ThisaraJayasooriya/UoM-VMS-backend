import express from "express";
import { getConfirmedAppointmentsCount, getConfirmedAppointments, getPendingAppointments, getPendingAppointmentsCount, updateAppointmentStatus, getAllAppointments, rescheduleAppointment, cancelAppointment } from "../controllers/hostAppointmentsController.js";


const router = express.Router();

router.get("/host/:hostId/pending", getPendingAppointments);

router.put("/status/:id", updateAppointmentStatus);

router.get("/host/:hostId/confirmed", getConfirmedAppointments);

router.get("/host/:hostId/pendingcount", getPendingAppointmentsCount);

router.get("/host/:hostId/confirmedcount", getConfirmedAppointmentsCount);

router.get("/host/:hostId/all", getAllAppointments);

router.put("/reschedule/:appointmentId", rescheduleAppointment);

router.put("/cancel/:appointmentId", cancelAppointment);

export default router;
