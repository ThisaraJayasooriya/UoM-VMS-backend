import Appointment from "../models/Appoinment.js";
import VerifyVisitor from "../models/VerifyVisitor.js";
import Staff from "../models/Staff.js";
import { getNextSequence } from "../utils/getNextSequence.js";
import VisitorSignup from "../models/VisitorSignup.js";
import HostAvailability from "../models/HostAvailability.js";

// Create appointment
export const makeAppoinment = async (req, res) => {
  console.log("Received request to create appointment:", req.body);
  try {
    const nextNumber = await getNextSequence("appointment");
    const customId = `M-${String(nextNumber).padStart(4, "0")}`;
    const {
      visitorId,
      firstname,
      lastname,
      contact,
      hostId,
      vehicle,
      category,
      reason,
    } = req.body;

    const appoinment = new Appointment({
      appointmentId: customId,
      visitorId,
      firstname,
      lastname,
      contact,
      hostId,
      vehicle,
      category,
      reason,
    });

    await appoinment.save();
    res
      .status(201)
      .json({ message: "Appoinment created successfully", appoinment });
  } catch (error) {
    console.error("Error creating appoinment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all appointments
export const getAppoinments = async (req, res) => {
  try {
    const appoinments = await Appointment.find();
    res.status(200).json(appoinments);
  } catch (error) {
    console.error("Error fetching appoinments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


  // Delete appointment
  export const deleteAppoinment = async (req, res) => {
    try {
      const { id } = req.params;
      const deletedAppoinment = await Appointment.findByIdAndDelete(id);
      if (!deletedAppoinment) {
        return res.status(404).json({ message: "Appoinment not found" });
      }
      res.status(200).json({ message: "Appoinment deleted successfully" });
    } catch (error) {
      console.error("Error deleting appoinment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };


// Get all hosts
export const getAllHosts = async (req, res) => {
  try {
    const hosts = await Staff.find({ role: "host" }).select("name _id faculty department");
    res.status(200).json(hosts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching hosts", error });
  }
};

// Get all faculties
export const getAllFaculties = async (req, res) => {
  try {
    const faculties = await Staff.distinct("faculty", { 
      role: "host", 
      faculty: { $ne: "", $exists: true } 
    });
    res.status(200).json(faculties.filter(faculty => faculty && faculty.trim() !== ""));
  } catch (error) {
    res.status(500).json({ message: "Error fetching faculties", error });
  }
};

// Get departments by faculty
export const getDepartmentsByFaculty = async (req, res) => {
  try {
    const { faculty } = req.params;
    const departments = await Staff.distinct("department", { 
      role: "host", 
      faculty: faculty,
      department: { $ne: "", $exists: true } 
    });
    res.status(200).json(departments.filter(dept => dept && dept.trim() !== ""));
  } catch (error) {
    res.status(500).json({ message: "Error fetching departments", error });
  }
};

// Get hosts by faculty and department
export const getHostsByFacultyAndDepartment = async (req, res) => {
  try {
    const { faculty, department } = req.params;
    
    let query = { role: "host" };
    
    if (faculty && faculty !== "all") {
      query.faculty = faculty;
    }
    
    if (department && department !== "all") {
      query.department = department;
    }
    
    const hosts = await Staff.find(query).select("name _id faculty department");
    res.status(200).json(hosts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching hosts", error });
  }
};

// Get accepted appointment for a visitor
export const getAcceptedAppointment = async (req, res) => {
  try {
    const { visitorId } = req.params;

    const appointment = await Appointment.findOne({
      visitorId,
      status: "accepted",
    }).populate("hostId", "firstname lastname");

    if (!appointment) {
      return res.status(404).json({ message: "No accepted appointment found" });
    }

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
      await appointment.save();

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// ✅ Confirm appointment
export const confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log(
      "Received request to confirm appointment with ID:",
      appointmentId
    );
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== "accepted") {
      return res
        .status(400)
        .json({ message: "Only accepted appointments can be confirmed" });
    }

    appointment.status = "confirmed";
    await appointment.save();

    const visitor = await VisitorSignup.findById(appointment.visitorId);
    if (!visitor) {
      console.error("Visitor not found for appointment:", appointmentId);
      return res.status(404).json({ message: "Visitor not found" });
    }

    // Handle HostAvailability update/creation - check selectedTimeSlot first
    let timeSlotData = null;

    if (appointment.selectedTimeSlot && appointment.selectedTimeSlot.date && appointment.selectedTimeSlot.startTime && appointment.selectedTimeSlot.endTime) {
      timeSlotData = appointment.selectedTimeSlot;
    } else if (appointment.response && appointment.response.date && appointment.response.startTime && appointment.response.endTime) {
      timeSlotData = appointment.response;
    }

    if (timeSlotData) {
      const { date, startTime, endTime } = timeSlotData;
      
      console.log("Time slot data:", { date, startTime, endTime });

      // Check if the time slot exists in HostAvailability
      const existingSlot = await HostAvailability.findOne({
        hostId: appointment.hostId,
        date: date,
        startTime: startTime,
        endTime: endTime
      });

      if (existingSlot) {
        // Update existing slot status to "booked"
        existingSlot.status = "booked";
        await existingSlot.save();
        console.log("Updated existing slot to booked:", existingSlot._id);
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
        console.log("Created new booked slot in HostAvailability:", newSlot._id);
      }
    } else {
      console.warn("No valid time slot data found for appointment:", appointmentId);
      console.log("appointment.selectedTimeSlot:", appointment.selectedTimeSlot);
      console.log("appointment.response:", appointment.response);
    }

    // Check if a VerifyVisitor already exists to prevent duplicates
    const existing = await VerifyVisitor.findOne({
      appointmentId: appointment.appointmentId,
    });
    if (!existing) {
      // Get the date for VerifyVisitor - prefer selectedTimeSlot, fallback to response
      const dateForVerify = appointment.selectedTimeSlot?.date || 
                           appointment.response?.date || 
                           new Date().toISOString().split('T')[0];

      // Create VerifyVisitor from appointment data
      const newVerifyVisitor = new VerifyVisitor({
        appointmentId: appointment.appointmentId,
        visitorId: visitor.visitorId,
        name: `${appointment.firstname} ${appointment.lastname}`,
        nic: visitor.nicNumber,
        vehicleNumber: appointment.vehicle,
        hostId: appointment.hostId.toString(),
        purpose: appointment.reason,
        company: "N/A",
        status: "Awaiting Check-In",
        date: dateForVerify,
      });

      await newVerifyVisitor.save();
    }

    res
      .status(200)
      .json({ message: "Appointment confirmed successfully", appointment });
  } catch (error) {
    console.error("Error confirming appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Visitor reject appointment
export const visitorRejectAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    console.log("Received request to reject appointment by visitor:", appointmentId);

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    if (appointment.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted appointments can be rejected by visitor" });
    }

    appointment.status = "visitorRejected";
    await appointment.save();

    res.status(200).json({ message: "Appointment rejected by visitor", appointment });
  } catch (error) {
    console.error("Error rejecting appointment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAppointmentStatus = async (req, res) => {
  try {
    const visitorId = req.params.visitorId;
    const appointments = await Appointment.find({
      visitorId: visitorId,
      status: { $in: ["Completed", "confirmed", "accepted", "visitorRejected", "pending", "rejected"] }
    }).populate("hostId", "name email faculty department");
    
    // Format the response to include more readable host information
    const formattedAppointments = appointments.map(appointment => {
      const formattedAppointment = appointment.toObject();
      
      // Add host name as a separate property if hostId exists
      if (formattedAppointment.hostId) {
        formattedAppointment.hostName = formattedAppointment.hostId.name || "Unknown Host";
        formattedAppointment.hostEmail = formattedAppointment.hostId.email;
        formattedAppointment.hostFaculty = formattedAppointment.hostId.faculty;
        formattedAppointment.hostDepartment = formattedAppointment.hostId.department;
      }
      
      // Add appointment time slot information in a more accessible format
      if (formattedAppointment.response) {
        formattedAppointment.appointmentDate = formattedAppointment.response.date || "";
        formattedAppointment.startTime = formattedAppointment.response.startTime || "";
        formattedAppointment.endTime = formattedAppointment.response.endTime || "";
      }
      
      return formattedAppointment;
    });
    
    res.status(200).json(formattedAppointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Error fetching appointments", error });

  }
};

// Get visit history (completed appointments) for a visitor
export const visitHistory = async (req, res) => {
  try {
    const { visitorId } = req.params;
    
    // Find appointments with "completed" status for the given visitorId
    const completedAppointments = await Appointment.find({
      visitorId: visitorId,
      status: "Completed"
    })
    .populate("hostId", "name email faculty department")
    .sort({ updatedAt: -1 }); // Sort by most recent first
    
    // Format the response to include more readable host information
    const formattedHistory = completedAppointments.map(appointment => {
      const formattedAppointment = appointment.toObject();
      
      // Add host name as a separate property if hostId exists
      if (formattedAppointment.hostId) {
        formattedAppointment.hostName = formattedAppointment.hostId.name || "Unknown Host";
        formattedAppointment.hostEmail = formattedAppointment.hostId.email;
        formattedAppointment.hostFaculty = formattedAppointment.hostId.faculty;
        formattedAppointment.hostDepartment = formattedAppointment.hostId.department;
      }
      
      // Add appointment time slot information in a more accessible format
      if (formattedAppointment.response) {
        formattedAppointment.appointmentDate = formattedAppointment.response.date || "";
        formattedAppointment.startTime = formattedAppointment.response.startTime || "";
        formattedAppointment.endTime = formattedAppointment.response.endTime || "";
      }
      
      // Add check-in and check-out times if available
      if (formattedAppointment.checkInTime) {
        formattedAppointment.formattedCheckInTime = new Date(formattedAppointment.checkInTime).toLocaleString();
      }
      
      if (formattedAppointment.checkOutTime) {
        formattedAppointment.formattedCheckOutTime = new Date(formattedAppointment.checkOutTime).toLocaleString();
      }
      
      // Calculate visit duration if both check-in and check-out times exist
      if (formattedAppointment.checkInTime && formattedAppointment.checkOutTime) {
        const checkIn = new Date(formattedAppointment.checkInTime);
        const checkOut = new Date(formattedAppointment.checkOutTime);
        const durationMs = checkOut - checkIn;
        
        // Convert to hours and minutes
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        
        formattedAppointment.visitDuration = `${hours}h ${minutes}m`;
      }
      
      return formattedAppointment;
    });
    
    res.status(200).json(formattedHistory);
  } catch (error) {
    console.error("Error fetching visit history:", error);
    res.status(500).json({ message: "Error fetching visit history", error });
  }
};

// Select time slot from available slots
export const selectTimeSlot = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { slotId } = req.body;

    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Check if this is a multiple slots appointment
    if (appointment.response.responseType !== "allSlots") {
      return res.status(400).json({ message: "This appointment doesn't have multiple slots" });
    }


    // Find the selected slot
    const selectedSlot = appointment.availableTimeSlots.find(
      slot => slot.slotId === slotId
    );

    if (!selectedSlot) {
      return res.status(404).json({ message: "Time slot not found" });
    }

    // Update appointment with selected slot
    appointment.selectedTimeSlot = selectedSlot;
    appointment.response = {
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      responseType: "allSlots",
    };

    await appointment.save();

    res.status(200).json({ 
      message: "Time slot selected successfully", 
      appointment 
    });
  } catch (error) {
    console.error("Error selecting time slot:", error);
    res.status(500).json({ message: "Server error" });
  }
};



