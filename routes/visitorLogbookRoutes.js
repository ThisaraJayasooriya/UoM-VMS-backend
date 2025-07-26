import express from 'express';
import { getVisitorLogbook, deleteLogEntry } from '../controllers/visitorLogbookController.js';
import { verifyToken } from '../controllers/AuthController.js';

const router = express.Router();

// GET all logbook entries
router.get('/', getVisitorLogbook);

// DELETE to remove a specific logbook entry by visitorId
router.delete('/:id', verifyToken, deleteLogEntry);

export default router;