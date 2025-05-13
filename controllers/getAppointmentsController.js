import Appointment from "../models/Appoinment.js";

export const getPendingAppointments = async (req, res) => {
  const hostId = req.params.hostId;

  try {
    const appointments = await Appointment.find({
      hostId,
      status: "pending"
    });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments", error });
  }
};
