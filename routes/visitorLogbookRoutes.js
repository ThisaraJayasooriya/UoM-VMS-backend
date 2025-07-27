import express from 'express';
import { getVisitorLogbook } from '../controllers/visitorLogbookController.js';

const router = express.Router();

// GET all logbook entries
router.get('/', getVisitorLogbook);

export default router;