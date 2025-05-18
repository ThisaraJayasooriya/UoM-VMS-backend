import express from 'express';
import { getVisitorStats } from '../controllers/securityController.js';

const router = express.Router();

router.get('/stats', getVisitorStats);

export default router;
