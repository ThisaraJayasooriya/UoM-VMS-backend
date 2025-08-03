import Activity from "../models/Activity.js";
import Appointment from "../models/Appoinment.js";
import VisitorSignup from "../models/VisitorSignup.js";
import VerifyVisitor from "../models/VerifyVisitor.js";

// Helper function to format 24-hour number to 12-hour AM/PM string
function formatHourToAMPM(hour24) {
  const ampm = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  hour12 = hour12 === 0 ? 12 : hour12;
  return `${hour12}:00 ${ampm}`;
}

export const getDashboardInsights = async (req, res) => {
  try {
    const range = req.query.range || "day";

    const now = new Date();
    let startDate;

    if (range === "day") {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "month") {
      startDate = new Date(now);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      return res.status(400).json({ error: "Invalid range parameter" });
    }

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Check-In / Check-Out counts
    const todayCheckInCount = await Activity.countDocuments({
      action: "Checked-In",
      timestamp: { $gte: startDate, $lte: endDate },
    });

    const todayCheckOutCount = await Activity.countDocuments({
      action: "Checked-Out",
      timestamp: { $gte: startDate, $lte: endDate },
    });

    // Trend: Daily counts
    const trendStats = await Activity.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$timestamp",
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing dates
    const fillDates = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = current.toISOString().split("T")[0];
      const found = trendStats.find((d) => d._id === key);
      fillDates.push({
        date: key,
        count: found ? found.total : 0,
      });
      current.setDate(current.getDate() + 1);
    }

    // Total Registered Visitors
    const totalVisitors = await VisitorSignup.countDocuments();

    // Visitor Distribution by category
    const visitorDistribution = await Appointment.aggregate([
      {
        $match: {
        status: "completed", // Only count completed visits
        requestedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
        _id: "$category",
        count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Peak Hour from Activity collection
    const peakHourResult = await Activity.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          hour: { $hour: "$timestamp" },
        },
      },
      {
        $group: {
          _id: "$hour",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);

    const peakHour = peakHourResult[0]
      ? formatHourToAMPM(peakHourResult[0]._id)
      : "N/A";

    // Live Monitoring
    const scheduledCount = await Appointment.countDocuments({
      status: "completed",
      requestedAt: { $gte: startDate, $lte: now },
    });

    const walkInCount = await VerifyVisitor.countDocuments({
      status: "Checked-In",
      createdAt: { $gte: startDate, $lte: now },
    });

    const totalLiveVisitors = scheduledCount + walkInCount;


    res.json({
      checkInCount: todayCheckInCount,
      checkOutCount: todayCheckOutCount,
      totalVisitors,
      peakHour,
      trend: fillDates,
      visitorDistribution,
        liveMonitoring: {
            scheduledCount,
            walkInCount,
            totalLiveVisitors,
        },      
    });
  } catch (err) {
    console.error("getInsights error:", err);
    res.status(500).json({ error: "Server error in getInsights" });
  }
};
