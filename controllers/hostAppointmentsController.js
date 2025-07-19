import Appointment from "../models/Appoinment.js";
import HostAvailability from "../models/HostAvailability.js";

export const getAllAppointments = async (req, res) => {
  const hostId = req.params.hostId;

  try {
    const appointments = await Appointment.find({
      hostId,
      status: { $in: ["incompleted", "completed"] },
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
      status: "pending",
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
        date: { $gte: new Date().toISOString().split("T")[0] }, // Future dates only
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
      status: "confirmed",
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
      status: "pending",
    });

    res.status(200).json(count);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching pending appointments count", error });
  }
};

export const getConfirmedAppointmentsCount = async (req, res) => {
  const hostId = req.params.hostId;

  try {
    const count = await Appointment.countDocuments({
      hostId,
      status: "confirmed",
    });

    res.status(200).json(count);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching confirmed appointments count", error });
  }
};

export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, startTime, endTime } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Get old time slot data for cleanup
    const oldTimeSlotData = appointment.selectedTimeSlot && appointment.selectedTimeSlot.date
      ? appointment.selectedTimeSlot
      : appointment.response;

    // Update the appointment's response time slot
    appointment.response = {
      ...appointment.response,
      date,
      startTime,
      endTime,
    };

    // Update selected time slot if it exists
    if (appointment.selectedTimeSlot && Object.keys(appointment.selectedTimeSlot).length > 0) {
      appointment.selectedTimeSlot = {
        ...appointment.selectedTimeSlot,
        date,
        startTime,
        endTime,
      };
    }

    // Handle HostAvailability updates
    if (oldTimeSlotData && oldTimeSlotData.date && oldTimeSlotData.startTime && oldTimeSlotData.endTime) {
      // Free up the old time slot (mark as available or delete if it was created for this appointment)
      const oldSlot = await HostAvailability.findOne({
        hostId: appointment.hostId,
        date: oldTimeSlotData.date,
        startTime: oldTimeSlotData.startTime,
        endTime: oldTimeSlotData.endTime,
        status: "booked"
      });

      if (oldSlot) {
        oldSlot.status = "available";
        await oldSlot.save();
        console.log("Freed up old time slot:", oldSlot._id);
      }
    }

    // Book the new time slot
    const existingNewSlot = await HostAvailability.findOne({
      hostId: appointment.hostId,
      date: date,
      startTime: startTime,
      endTime: endTime
    });

    if (existingNewSlot) {
      // Update existing slot status to "booked"
      existingNewSlot.status = "booked";
      await existingNewSlot.save();
      console.log("Updated new slot to booked:", existingNewSlot._id);
    } else {
      // Create new slot with "booked" status
      const newSlot = new HostAvailability({
        hostId: appointment.hostId,
        date: date,
        startTime: startTime,
        endTime: endTime,
        status: "booked"
      });
      await newSlot.save();
      console.log("Created new booked slot for rescheduled appointment:", newSlot._id);
    }

    await appointment.save();
    res.status(200).json(appointment);
  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    res.status(500).json({ message: "Error rescheduling appointment", error });
  }
};

export const cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Get time slot data for cleanup
    const timeSlotData = appointment.selectedTimeSlot && appointment.selectedTimeSlot.date
      ? appointment.selectedTimeSlot
      : appointment.response;

    // Remove the booked time slot from HostAvailability
    if (timeSlotData && timeSlotData.date && timeSlotData.startTime && timeSlotData.endTime) {
      const bookedSlot = await HostAvailability.findOneAndDelete({
        hostId: appointment.hostId,
        date: timeSlotData.date,
        startTime: timeSlotData.startTime,
        endTime: timeSlotData.endTime,
        status: "booked"
      });

      if (bookedSlot) {
        console.log("Deleted booked time slot from HostAvailability:", bookedSlot._id);
      } else {
        console.log("No matching booked slot found to delete");
      }
    }

    // Cancel the appointment
    appointment.status = "hostRejected";
    await appointment.save();

    res.status(200).json({ message: "Appointment canceled successfully" });
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ message: "Error canceling appointment", error });
  }
};
