import Visitor from '../models/Activity.js'; // use `import` instead of `require`

export const getVisitorStats = async (req, res) => {
  try {
    const totalCheckedIn = await Visitor.countDocuments({ action: 'Checked-In' });
    const totalCheckedOut = await Visitor.countDocuments({ action: 'Checked-Out' });

    res.status(200).json({
      totalCheckedIn,
      totalCheckedOut,
    });
  } catch (error) {
    console.error("Error fetching visitor stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
