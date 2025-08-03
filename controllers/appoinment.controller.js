import Appointment from "../models/Appoinment.js";
import VerifyVisitor from "../models/VerifyVisitor.js";
import Staff from "../models/Staff.js";
import { getNextSequence } from "../utils/getNextSequence.js";
import VisitorSignup from "../models/VisitorSignup.js";
import HostAvailability from "../models/HostAvailability.js";
import sendEmail from "../utils/sendEmail.js";

// Get visitor details for auto-filling appointment form
export const getVisitorDetailsById = async (req, res) => {
  try {
    const { visitorId } = req.params;
    
    // Find visitor by ID
    const visitor = await VisitorSignup.findById(visitorId);
    
    if (!visitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }
    
    // Return only the details needed for auto-fill
    const visitorDetails = {
      firstname: visitor.firstName,
      lastname: visitor.lastName,
      contact: visitor.phoneNumber
    };
    
    res.status(200).json(visitorDetails);
  } catch (error) {
    console.error("Error fetching visitor details:", error);
    res.status(500).json({ message: "Error fetching visitor details", error: error.message });
  }
};

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
      });      await newVerifyVisitor.save();
    }

    // Send simple email with appointment ID
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #124E66, #2E8BC0); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Appointment Confirmed!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">University of Moratuwa - Visitor Management System</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
          <h2 style="color: #124E66; margin-top: 0;">Hello ${appointment.firstname} ${appointment.lastname},</h2>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Your appointment has been confirmed! Please save your appointment ID for check-in:
          </p>
          
          <div style="background: #f8f9fa; border: 2px solid #2E8BC0; padding: 30px; margin: 25px 0; border-radius: 10px; text-align: center;">
            <h3 style="color: #124E66; margin-top: 0; margin-bottom: 15px; font-size: 18px;">📋 Your Appointment ID</h3>
            <div style="background: #124E66; color: white; padding: 20px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 2px;">
              ${appointment.appointmentId}
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #856404; margin-top: 0; margin-bottom: 15px;">⚠️ Important Check-in Instructions:</h4>
            <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>Present this Appointment ID to the security person when checking in</strong></li>
              <li>Bring a valid ID for verification</li>
              <li>Arrive 10-15 minutes early</li>
            </ul>
          </div>
          
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 30px;">
            Thank you for using UoM Visitor Management System. We look forward to your visit!
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
          <p style="margin: 0; font-size: 12px; color: #666;">
            This is an automated email. Please do not reply to this message.<br>
            University of Moratuwa - Visitor Management System
          </p>
        </div>
      </div>
    `;

    // Send confirmation email with appointment ID
    try {
      const emailResult = await sendEmail({
        to: visitor.email,
        subject: `Appointment ID: ${appointment.appointmentId} - Please Save for Check-in`,
        html: emailContent
      });

      if (emailResult.success) {
        console.log(`Appointment ID email sent successfully to ${visitor.email}`);
      } else {
        console.error("Failed to send appointment ID email:", emailResult.message);
      }
    } catch (emailError) {
      console.error("Error sending appointment ID email:", emailError);
      // Don't fail the appointment confirmation if email fails
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
    const formattedAppointments = await Promise.all(appointments.map(async (appointment) => {
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

      // Fetch check-in time from VerifyVisitor model
      try {
        const verifyVisitor = await VerifyVisitor.findOne({
          appointmentId: formattedAppointment.appointmentId
        });

        if (verifyVisitor) {
          formattedAppointment.checkInTime = verifyVisitor.checkInTime || null;
          formattedAppointment.checkOutTime = verifyVisitor.checkOutTime || null;
          formattedAppointment.verifyVisitorStatus = verifyVisitor.status || null;
          
          // Format check-in time for display
          if (verifyVisitor.checkInTime) {
            formattedAppointment.formattedCheckInTime = new Date(verifyVisitor.checkInTime).toLocaleString();
          }
          
          // Format check-out time for display
          if (verifyVisitor.checkOutTime) {
            formattedAppointment.formattedCheckOutTime = new Date(verifyVisitor.checkOutTime).toLocaleString();
          }
        }
      } catch (verifyError) {
        console.error("Error fetching VerifyVisitor data for appointment:", formattedAppointment.appointmentId, verifyError);
        // Continue without VerifyVisitor data if there's an error
        formattedAppointment.checkInTime = null;
        formattedAppointment.checkOutTime = null;
      }
      
      return formattedAppointment;
    }));
    
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


// ✅ Get today's appointments count
export const getTodayAppointmentsCount = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayCount = await Appointment.countDocuments({
      requestedAt: { $gte: today, $lt: tomorrow },
    });

    res.status(200).json({ todayAppointments: todayCount });
  } catch (error) {
    console.error("Error counting today's appointments:", error);
     res.status(500).json({ message: "Server error" });
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



