import express from 'express';
import { getDashboardInsights } from '../controllers/insightsController.js';

const router = express.Router();

router.get('/', getDashboardInsights);

export default router;
