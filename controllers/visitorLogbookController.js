import VerifyVisitor from '../models/VerifyVisitor.js';
import VisitorSignup from '../models/VisitorSignup.js';
import Staff from '../models/Staff.js';

export const getVisitorLogbook = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 5 } = req.query;

    // Validate date inputs
    if (startDate && isNaN(Date.parse(startDate))) {
      return res.status(400).json({ message: 'Invalid start date' });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json({ message: 'Invalid end date' });
    }

    // Default to yesterday to today if no dates provided
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getUTCDate() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    // Normalize dates to UTC
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);

    console.log('Querying logs with start:', start.toISOString(), 'end:', end.toISOString());

    const query = {
      $or: [
        { checkInTime: { $gte: start, $lte: end } },
        { checkInTime: null, createdAt: { $gte: start, $lte: end } },
      ],
    };

    const skip = (page - 1) * limit;
    const logEntries = await VerifyVisitor.find(query).lean().skip(skip).limit(parseInt(limit));
    const total = await VerifyVisitor.countDocuments(query);

    console.log('Found log entries:', logEntries.length, 'Total:', total);
    console.log('Log entries details:', logEntries.map(e => ({
      visitorId: e.visitorId,
      checkInTime: e.checkInTime,
      createdAt: e.createdAt,
    })));

    for (const entry of logEntries) {
      // Enrich email and name from VisitorSignup
      const signup = await VisitorSignup.findOne({ visitorId: entry.visitorId }).lean();
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
      entry.checkInTime = entry.checkInTime || null;
      entry.checkOutTime = entry.checkOutTime || null;
    }

    res.json({ logEntries, total });
  } catch (error) {
    console.error('Error fetching visitor logbook:', error);
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