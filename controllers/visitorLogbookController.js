import VerifyVisitor from '../models/VerifyVisitor.js';
import VisitorSignup from '../models/VisitorSignup.js';

// Fetch all logbook entries
export const getVisitorLogbook = async (req, res) => {
  try {
    const logEntries = await VerifyVisitor.find().lean();

    for (const entry of logEntries) {
      const signup = await VisitorSignup.findOne({ visitorId: entry.visitorId });
      entry.email = signup ? signup.email : '';
      if (!entry.name || entry.name.trim() === '') {
        entry.name = signup ? `${signup.firstName} ${signup.lastName}` : entry.name || 'Unknown';
      }
      if (!entry.visitorId) {
        entry.visitorId = signup ? signup.visitorId : entry.visitorId || 'Unknown';
      }
    }

    res.json(logEntries);
  } catch (error) {
    console.error('Error fetching visitor logbook:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a logbook entry
export const updateLogEntry = async (req, res) => {
  try {
    const { id } = req.params; // visitorId from the URL
    const updates = req.body; // Expecting fields like checkOutTime, status, host, purpose

    const updatedEntry = await VerifyVisitor.findOneAndUpdate(
      { visitorId: id },
      { $set: updates },
      { new: true, runValidators: true, lean: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Sync email and name from VisitorSignup if needed
    const signup = await VisitorSignup.findOne({ visitorId: id });
    updatedEntry.email = signup ? signup.email : updatedEntry.email || '';
    if (!updatedEntry.name || updatedEntry.name.trim() === '') {
      updatedEntry.name = signup ? `${signup.firstName} ${signup.lastName}` : updatedEntry.name || 'Unknown';
    }

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating logbook entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a logbook entry (optional, if you prefer separate function)
export const deleteLogEntry = async (req, res) => {
  try {
    const { id } = req.params; // visitorId from the URL

    const deletedEntry = await VerifyVisitor.findOneAndDelete({ visitorId: id });

    if (!deletedEntry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting logbook entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
};