import VerifyVisitor from "../models/VerifyVisitor.js";
import Activity from "../models/Activity.js";
import Appointment from "../models/Appoinment.js";
import Staff from "../models/Staff.js";

// Search visitor by visitorId or NIC
export const searchVisitor = async (req, res) => {
  const { term } = req.query;

  try {
    const visitor = await VerifyVisitor.findOne({
      $or: [
        { appointmentId: { $regex: term, $options: "i" } }, 
        { nic: { $regex: term, $options: "i" } },
      ],
    });

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }
    const staff = await Staff.findOne({ _id: visitor.hostId });

    if (!staff) {
      return res.status(404).json({ message: "Host not found" });
    }

    res.status(200).json({
      visitor,
      staff,
    });
  } catch (error) {
    res.status(500).json({ message: "Error searching for visitor", error: error.message });
  }
};

// Check-in visitor
export const checkInVisitor = async (req, res) => {
  const { appointmentId } = req.params; 

  try {
    const visitor = await VerifyVisitor.findOne({ appointmentId });

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    if (visitor.status === "Checked-In") {
      return res.status(400).json({ message: "Visitor already checked in" });
    }

    if (visitor.status === "Checked-Out") {
      return res.status(400).json({ message: "Visitor already checked out" });
    }

    visitor.checkInTime = new Date();
    visitor.status = "Checked-In";
    await visitor.save();
    
    // Update appointment status to "completed"
    await Appointment.findOneAndUpdate(
      { appointmentId },
      { status: "completed" }
    );


    // Log activity
    const activity = new Activity({
      visitorId: visitor.visitorId, 
      name: visitor.name,
      action: "Checked-In",
      timestamp: new Date(),
    });
    await activity.save();

    res.status(200).json({ message: "Visitor checked in successfully", visitor });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate visitorId or NIC detected" });
    }
    res.status(500).json({ message: "Error checking in visitor", error: error.message });
  }
};

// Check-out visitor
export const checkOutVisitor = async (req, res) => {
  const { appointmentId } = req.params; 

  try {
    const visitor = await VerifyVisitor.findOne({ appointmentId });

    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    if (visitor.status !== "Checked-In") {
      return res.status(400).json({ message: "Visitor is not checked in" });
    }

    visitor.checkOutTime = new Date();
    visitor.status = "Checked-Out";
    await visitor.save();

    // Log activity
    const activity = new Activity({
      visitorId: visitor.visitorId, 
      name: visitor.name,
      action: "Checked-Out",
      timestamp: new Date(),
    });
    await activity.save();

    res.status(200).json({ message: "Visitor checked out successfully", visitor });
  } catch (error) {
    res.status(500).json({ message: "Error checking out visitor", error: error.message });
  }
};

// Get recent activities
export const getRecentActivities = async (req, res) => {
  try {
    // Ensure only the latest 10 activities are returned
    const activities = await Activity.find({})
      .sort({ timestamp: -1 })
      .limit(10)
      .exec();

    res.status(200).json(activities);
  } catch (error) {
    res.status(500).json({ message: "Error fetching recent activities", error: error.message });
  }
};