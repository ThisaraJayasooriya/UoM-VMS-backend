import Appointment from "../models/Appoinment.js";
import HostAvailability from "../models/HostAvailability.js";

export const getAllAppointments = async (req, res) => {
  const hostId = req.params.hostId;

  try {
    const appointments = await Appointment.find({
      hostId,
      status: { $in: ["incompleted", "completed"] }
    });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments", error });
  }
};


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

// Update appointment status and optionally customize ID format
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, date, startTime, endTime, responseType } = req.body;

    // Find the appointment first
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Update basic fields
    appointment.status = status;
    
    if (responseType === "allSlots") {
      // Get host's available time slots
      const hostSlots = await HostAvailability.find({
        hostId: appointment.hostId,
        status: "available",
        date: { $gte: new Date().toISOString().split('T')[0] } // Future dates only
      });
      
      // Store available slots in appointment
      appointment.availableTimeSlots = hostSlots.map((slot, index) => ({
        slotId: `slot_${Date.now()}_${index}`,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
      
      appointment.response = {
        responseType: "allSlots",
      };
    } else {
      // Handle single slot (original behavior)
      appointment.response = {
        date,
        startTime,
        endTime,
        responseType,
      };
    }

    // If accepted, change the customId format
    if (status === "accepted" && appointment.appointmentId?.startsWith("M-")) {
      const number = appointment.appointmentId.split("-")[1]; // e.g., 0001
      appointment.appointmentId = `A-${number}`; // Change to M0001
    }

    await appointment.save();

    res.status(200).json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getConfirmedAppointments = async (req, res) => {
  const hostId = req.params.hostId;

  try {
    const appointments = await Appointment.find({
      hostId,
      status: "confirmed"
    });

    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching appointments", error });
  }
};

  export const getPendingAppointmentsCount = async (req, res) => {
    const hostId = req.params.hostId;

    try {
      const count = await Appointment.countDocuments({
        hostId,
        status: "pending"
      });

      res.status(200).json(count);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending appointments count", error });
    }
  };

   export const getConfirmedAppointmentsCount = async (req, res) => {
    const hostId = req.params.hostId;

    try {
      const count = await Appointment.countDocuments({
        hostId,
        status: "confirmed"
      });

      res.status(200).json(count);
    } catch (error) {
      res.status(500).json({ message: "Error fetching confirmed appointments count", error });
    }
  };

