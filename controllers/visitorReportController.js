import Appointment from "../models/Appoinment.js";
import VisitorReport from "../models/VisitorReport.js";
import Notification from "../models/Notification.js";

export const reportVisitor = async (req, res) => {
  const { appointmentId, hostId, reason, category, visitorEmail } = req.body;

  if (!appointmentId || !hostId || !reason || !category) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const appointment = await Appointment.findOne({
      appointmentId
    }).populate("visitorId");
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found." });
    }

    const newReport = new VisitorReport({
      appointmentId,
      hostId,
      reason,
      category,
      visitorId: appointment.visitorId._id,
      visitorName: `${appointment.visitorId.firstName} ${appointment.visitorId.lastName}`,
      visitorEmail: appointment.visitorId.email || visitorEmail,
    });

    await newReport.save();

    // Create notification for admin
    const notification = new Notification({
      message: `Visitor Report: ${category} - ${reason} (Visitor: ${appointment.visitorId.firstName} ${appointment.visitorId.lastName}, Email: ${appointment.visitorId.email})`,
      type: "visitor",
      read: false,
      timestamp: new Date(),
    });
    await notification.save();

    res.status(201).json({ message: "Report submitted successfully." });
  } catch (error) {
    console.error("Error submitting visitor report:", error);
    res.status(500).json({ message: "Server error while submitting report." });
  }
};