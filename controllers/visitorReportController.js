import Appointment from "../models/Appoinment.js";
import VisitorReport from "../models/VisitorReport.js";

export const reportVisitor = async (req, res) => {
  const { appointmentId, hostId, reason, category } = req.body;

  if (!appointmentId || !hostId || !reason || !category) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const appointments = await Appointment.findOne({
        appointmentId
    }).populate("visitorId")
    const newReport = new VisitorReport({
      appointmentId,
      hostId,
      reason,
      category,
      visitorId: appointments.visitorId,
      visitorName: appointments.visitorId.firstName + " " + appointments.visitorId.lastName,
    });

    await newReport.save();

    res.status(201).json({ message: "Report submitted successfully." });
  } catch (error) {
    console.error("Error submitting visitor report:", error);
    res.status(500).json({ message: "Server error while submitting report." });
  }
};
