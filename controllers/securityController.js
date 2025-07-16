import VerifyVisitor from "../models/VerifyVisitor.js";

export const getVisitorStats = async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Total number of visitors who checked in today
    const totalCheckedIn = await VerifyVisitor.countDocuments({
      status: "Checked-In",
      date: today,
    });

    // Total number of visitors who checked out today
    const totalCheckedOut = await VerifyVisitor.countDocuments({
      status: "Checked-Out",
      date: today,
    });

    // Total number of VerifyVisitor records for today (any status)
    const totalVisitorsToday = await VerifyVisitor.countDocuments({
      date: today,
    });

    //Expected
    const expectedVisitorsToday = await VerifyVisitor.countDocuments({
      date: today, status: "Awaiting Check-In",
    });

    res.status(200).json({
      expectedVisitorsToday,
      totalCheckedIn,
      totalCheckedOut,
      totalVisitorsToday,
    });
  } catch (error) {
    console.error("Error fetching visitor stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};
