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

export default router;