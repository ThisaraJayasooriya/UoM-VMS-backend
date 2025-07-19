import VerifyVisitor from '../models/VerifyVisitor.js';
import VisitorSignup from '../models/VisitorSignup.js';
import Staff from '../models/Staff.js';

export const getVisitorLogbook = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Default to yesterday to today if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    // Ensure end date includes the full day
    end.setHours(23, 59, 59, 999);

    const query = {
      $or: [
        { checkInTime: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } },
      ],
    };

    const logEntries = await VerifyVisitor.find(query).lean();

    for (const entry of logEntries) {
      // Enrich email and name from VisitorSignup
      const signup = await VisitorSignup.findOne({ visitorId: entry.visitorId });
      entry.email = signup ? signup.email : '';
      if (!entry.name || entry.name.trim() === '') {
        entry.name = signup ? `${signup.firstName} ${signup.lastName}` : entry.name || 'Unknown';
      }
      if (!entry.visitorId) {
        entry.visitorId = signup ? signup.visitorId : entry.visitorId || 'Unknown';
      }

      // Resolve hostId to host name
      if (entry.hostId) {
        const staff = await Staff.findById(entry.hostId).lean();
        entry.host = staff ? staff.name : 'Not Assigned';
      } else {
        entry.host = 'Not Assigned';
      }

      // Map fields for frontend compatibility
      entry.purpose = entry.purpose || 'Not Specified';
      entry.checkIn = entry.checkInTime || null;
      entry.checkOut = entry.checkOutTime || null;
    }

    res.json(logEntries);
  } catch (error) {
    console.error('Error fetching visitor logbook:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLogEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedEntry = await VerifyVisitor.findOneAndUpdate(
      { visitorId: id },
      { $set: updates },
      { new: true, runValidators: true, lean: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: 'Entry not found' });
    }

    // Sync email and name from VisitorSignup
    const signup = await VisitorSignup.findOne({ visitorId: id });
    updatedEntry.email = signup ? signup.email : updatedEntry.email || '';
    if (!updatedEntry.name || updatedEntry.name.trim() === '') {
      updatedEntry.name = signup ? `${signup.firstName} ${signup.lastName}` : updatedEntry.name || 'Unknown';
    }

    // Resolve hostId to host name
    if (updatedEntry.hostId) {
      const staff = await Staff.findById(updatedEntry.hostId).lean();
      updatedEntry.host = staff ? staff.name : 'Not Assigned';
    } else {
      updatedEntry.host = 'Not Assigned';
    }

    res.json(updatedEntry);
  } catch (error) {
    console.error('Error updating logbook entry:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteLogEntry = async (req, res) => {
  try {
    const { id } = req.params;

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