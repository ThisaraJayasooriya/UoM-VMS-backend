import express from 'express';
import {
  makeAppoinment,
  getAllHosts,
  getAllFaculties,
  getDepartmentsByFaculty,
  getHostsByFacultyAndDepartment,
  getAcceptedAppointment,
  confirmAppointment,
  visitorRejectAppointment,
  getAppointmentStatus,
  visitHistory,
} from '../controllers/appoinment.controller.js';

const router = express.Router();

router.post('/createAppointment', makeAppoinment);
router.get('/gethosts', getAllHosts);
router.get('/faculties', getAllFaculties);
router.get('/departments/:faculty', getDepartmentsByFaculty);
router.get('/hosts/:faculty/:department', getHostsByFacultyAndDepartment);
router.get("/acceptedAppointment/:visitorId", getAcceptedAppointment);
router.put("/confirmAppointment/:appointmentId", confirmAppointment);
router.put("/rejectAppointments/:appointmentId", visitorRejectAppointment); 
router.get('/appointmentStatus/:visitorId', getAppointmentStatus);
router.get('/visitHistory/:visitorId', visitHistory);

export default router;
