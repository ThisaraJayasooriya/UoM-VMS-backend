import express from 'express';
import Feedback from '../models/Feedback.js';

const router = express.Router();

// POST /api/feedback - Submit feedback
router.post('/', async (req, res, next) => {
  try {
    const { name, email, rating, experience } = req.body;

    // Validate required fields
    if (!name || !email || !rating || !experience) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Create new feedback entry
    const feedback = new Feedback({
      name,
      email,
      rating,
      experience,
    });

    // Save to MongoDB
    await feedback.save();

    // Send success response
    res.status(201).json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    // Pass error to error handling middleware
    next(error);
  }
});

// GET /api/feedback - Retrieve all feedback entries
router.get('/', async (req, res, next) => {
  try {
    const feedbackEntries = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json(feedbackEntries);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/feedback/:id - Delete a feedback entry
router.delete('/:id', async (req, res, next) => {
  try {
    console.log(`Received DELETE request for ID: ${req.params.id}`);
    const feedback = await Feedback.findByIdAndDelete(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    res.status(200).json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error(`DELETE error for ID ${req.params.id}:`, error);
    next(error);
  }
});

export default router;