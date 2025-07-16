import express from 'express';
import { getVisitorHistoryReport } from '../controllers/visitorHistoryController.js';

const router = express.Router();

// Route for visitor history report
router.get('/visitor-history', getVisitorHistoryReport);

export default router;