import Appointment from "../models/Appoinment.js";
import HostAvailability from "../models/HostAvailability.js";
import sendEmail from "../utils/sendEmail.js";

export const getAllAppointments = async (req, res) => {
  const hostId = req.params.hostId;

  try {
    const appointments = await Appointment.find({
      hostId,
      status: { $in: ["Incompleted", "Completed"] },
    })
    .populate("visitorId", "visitorId")

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
    }).populate("visitorId", "email");

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

// PATCH: Reschedule an appointment
export const rescheduleAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { date, startTime, endTime } = req.body; // Changed from newTimeSlot to individual fields

  try {
    // Validate input
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: "Date, startTime, and endTime are required" });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate("visitorId")
      .populate("hostId", "name");
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // ✅ CAPTURE OLD TIME SLOT DATA IMMEDIATELY (before any updates)
    const oldTimeSlotData =
      appointment.selectedTimeSlot && appointment.selectedTimeSlot.date
        ? appointment.selectedTimeSlot
        : appointment.response;

    if (!oldTimeSlotData || !oldTimeSlotData.date) {
      return res.status(400).json({ message: "No existing time slot found to reschedule" });
    }

    // ✅ SAVE OLD VALUES IMMEDIATELY (before updating appointment)
    const oldDate = oldTimeSlotData.date;
    const oldStartTime = oldTimeSlotData.startTime;
    const oldEndTime = oldTimeSlotData.endTime;

    const hostId = appointment.hostId._id;

    console.log("Attempting to delete old slot with:");
    console.log({
      hostId,
      date: oldDate,
      startTime: oldStartTime,
      endTime: oldEndTime,
      status: "booked"
    });

    // Delete old slot from HostAvailability
    const deleted = await HostAvailability.findOneAndDelete({
      hostId,
      date: oldDate,
      startTime: oldStartTime,
      endTime: oldEndTime,
      status: "booked"
    });

    if (deleted) {
      console.log("Old booked slot deleted successfully:", deleted._id);
    } else {
      console.log("No matching booked slot found to delete");
    }

    // Create new booked slot
    const newSlot = new HostAvailability({
      hostId,
      date,
      startTime,
      endTime,
      status: "booked"
    });
    await newSlot.save();
    console.log("Created new booked slot for rescheduled appointment:", newSlot._id);

    // Update appointment with new time slot
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

    await appointment.save();

    // Prepare email content using pre-saved old values
    const visitorName = appointment.visitorId.firstName && appointment.visitorId.lastName 
      ? `${appointment.visitorId.firstName} ${appointment.visitorId.lastName}`
      : appointment.visitorId.email;
    const hostName = appointment.hostId?.name || "the host";
    const oldTime = `${oldStartTime} - ${oldEndTime}`;
    const newTime = `${startTime} - ${endTime}`;

    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Appointment Rescheduled</h2>
        
        <h3>Hello ${visitorName},</h3>
        <p>Your appointment with <b>${hostName}</b> has been <span style="color: #ff9800; font-weight: bold;">rescheduled</span>.</p>
        
        <div style="background-color: #ffebee; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0;">
          <h4 style="color: #d32f2f; margin-top: 0;">Previous Schedule:</h4>
          <p><strong>Date:</strong> ${oldDate}</p>
          <p><strong>Time:</strong> ${oldTime}</p>
        </div>

        <div style="background-color: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0;">
          <h4 style="color: #2e7d32; margin-top: 0;">New Schedule:</h4>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${newTime}</p>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Appointment ID:</strong> ${appointment.appointmentId}</p>
          <p><strong>Purpose:</strong> ${appointment.reason || "Not specified"}</p>
          <p><strong>Host:</strong> ${hostName}</p>
        </div>
        
        <p><strong>Important:</strong> Please make note of your new appointment date and time.</p>
        
        <p>Thank you for your understanding.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #666; text-align: center;">
          This is an automated email from UoM Visitor Management System.<br>
          Please do not reply to this email.
        </p>
      </div>
    `;

    // Send email notification
    if (appointment.visitorId && appointment.visitorId.email) {
      try {
        await sendEmail({
          to: appointment.visitorId.email,
          subject: "Appointment Rescheduled - New Date and Time",
          html: emailContent,
        });
        console.log("Reschedule notification email sent successfully to:", appointment.visitorId.email);
      } catch (emailError) {
        console.error("Failed to send reschedule notification email:", emailError);
        // Don't fail the whole operation if email fails
      }
    } else {
      console.log("No visitor email found, skipping email notification");
    }

    return res.status(200).json({ 
      message: "Appointment rescheduled successfully", 
      appointment 
    });

  } catch (error) {
    console.error("Error rescheduling appointment:", error);
    return res.status(500).json({ message: "Server error during rescheduling", error: error.message });
  }
};

export const cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await Appointment.findById(appointmentId)
      .populate("visitorId")
      .populate("hostId", "name");

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Get time slot data for cleanup
    const timeSlotData =
      appointment.selectedTimeSlot && appointment.selectedTimeSlot.date
        ? appointment.selectedTimeSlot
        : appointment.response;

    // Remove the booked time slot from HostAvailability
    if (
      timeSlotData &&
      timeSlotData.date &&
      timeSlotData.startTime &&
      timeSlotData.endTime
    ) {
      const bookedSlot = await HostAvailability.findOneAndDelete({
        hostId: appointment.hostId,
        date: timeSlotData.date,
        startTime: timeSlotData.startTime,
        endTime: timeSlotData.endTime,
        status: "booked",
      });

      if (bookedSlot) {
        console.log(
          "Deleted booked time slot from HostAvailability:",
          bookedSlot._id
        );
      } else {
        console.log("No matching booked slot found to delete");
      }
    }

    // Cancel the appointment
    appointment.status = "hostRejected";
    await appointment.save();

    // Send email to the visitor
    if (appointment.visitorId && appointment.visitorId.email) {
      const visitorEmail = appointment.visitorId.email;
      const visitorName = `${appointment.visitorId.firstName} ${appointment.visitorId.lastName}`;
      const hostName = appointment.hostId?.name || "the host";
      const appointmentDate = timeSlotData?.date || "N/A";

      const emailContent = `
        <h3>Hello ${visitorName},</h3>
        <p>We regret to inform you that your appointment with <b>${hostName}</b> has been <span style="color:red;">cancelled</span>.</p>
        <p><strong>Date:</strong> ${appointmentDate}</p>
        <p><strong>Time:</strong> ${timeSlotData?.startTime || "N/A"} - ${
        timeSlotData?.endTime || "N/A"
      }</p>
        <p><strong>Reason:</strong> ${appointment.reason || "Not specified"}</p>
        <p>Please reschedule if needed. Sorry for the inconvenience.</p>
      `;

      console.log("Sending email to:", visitorEmail);
      console.log("Email content:", emailContent);

      try {
        await sendEmail({
          to: visitorEmail,
          subject: "Appointment Cancelled",
          html: emailContent,
        });
        console.log("Email sent successfully");
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
        // Don't fail the whole operation if email fails
      }
    } else {
      console.log("No visitor email found, skipping email notification");
    }

    res.status(200).json({ message: "Appointment canceled successfully" });
  } catch (error) {
    console.error("Error canceling appointment:", error);
    res.status(500).json({ message: "Error canceling appointment", error });
  }
};
