import express from 'express';
import { makeAppoinment } from '../controllers/appoinment.controller.js';

const router = express.Router();

router.post('/createAppointment', makeAppoinment);

export default router;
