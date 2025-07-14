import express from 'express';
import { getVisitorLogbook, updateLogEntry } from '../controllers/visitorLogbookController.js';
import VerifyVisitor from '../models/VerifyVisitor.js'; // Ensure this path is correct

const router = express.Router();

// GET all logbook entries
router.get('/', getVisitorLogbook);

// PUT to update a specific logbook entry by visitorId
router.put('/:id', updateLogEntry);

// DELETE to remove a specific logbook entry by visitorId
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params; // visitorId from the URL

    console.log(`Attempting to delete entry with visitorId: ${id}`); // Debug log
    const deletedEntry = await VerifyVisitor.findOneAndDelete({ visitorId: id });

    if (!deletedEntry) {
      console.log(`No entry found for visitorId: ${id}`); // Debug log
      return res.status(404).json({ message: 'Entry not found' });
    }

    console.log(`Successfully deleted entry with visitorId: ${id}`); // Debug log
    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting logbook entry:', error); // Detailed error log
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;