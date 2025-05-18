import express from 'express';
import { makeAppoinment } from '../controllers/appoinment.controller.js';
import { getAllHosts } from '../controllers/appoinment.controller.js';
import { getAcceptedAppointment } from '../controllers/appoinment.controller.js';




const router = express.Router();

router.post('/createAppointment', makeAppoinment);
router.get('/gethosts', getAllHosts);
router.get("/acceptedAppointment/:visitorId", getAcceptedAppointment);
export default router;