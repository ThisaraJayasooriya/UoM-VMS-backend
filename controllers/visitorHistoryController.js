import VerifyVisitor from '../models/VerifyVisitor.js';
import Staff from '../models/Staff.js';

export const getVisitorHistoryReport = async (req, res) => {
  try {
    const { searchQuery = '', selectedDate = '' } = req.query;

    console.log('Query params:', { searchQuery, selectedDate }); // Debug query params

    // Fetch checked-in visitors
    let query = { checkInTime: { $ne: null } };

    // Apply search filter
    if (searchQuery) {
      query.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { visitorId: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    // Apply date filter
    if (selectedDate) {
      query.checkInTime = {
        $gte: new Date(selectedDate),
        $lt: new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 1)),
      };
    }

    const rawVisitors = await VerifyVisitor.find(query).lean();
    console.log('Raw VerifyVisitor data:', rawVisitors.map(v => ({
      visitorId: v.visitorId,
      name: v.name,
      hostId: v.hostId,
      purpose: v.purpose,
      checkInTime: v.checkInTime,
      checkOutTime: v.checkOutTime
    })));

    // Map entries and resolve host names
    const historyEntries = [];
    for (const entry of rawVisitors) {
      let host = 'Not Assigned';
      if (entry.hostId) {
        const staff = await Staff.findById(entry.hostId).lean();
        console.log(`Resolving hostId ${entry.hostId}:`, staff); // Debug staff lookup
        host = staff ? staff.name : 'Not Assigned';
      }

      historyEntries.push({
        id: entry.visitorId || 'Unknown',
        visitor: entry.name || 'Unknown',
        host,
        purpose: entry.purpose || 'Not Specified',
        checkIn: entry.checkInTime || null,
        checkOut: entry.checkOutTime || null,
      });
    }

    console.log('Mapped history entries:', historyEntries); // Debug final output

    if (historyEntries.length === 0) {
      console.log('No checked-in visitors found');
    }

    res.json(historyEntries);
  } catch (error) {
    console.error('Error fetching visitor history report:', error);
    res.status(500).json({ message: 'Server error' });
  }
};