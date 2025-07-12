import Appointment from "../models/Appoinment.js";
import VerifyVisitor from "../models/VerifyVisitor.js";
import Staff from "../models/Staff.js";
import { getNextSequence } from "../utils/getNextSequence.js";
import VisitorSignup from "../models/VisitorSignup.js";

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
    const hosts = await Staff.find({ role: "host" }).select("name _id");
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
      // Handle case where visitor is not found
      console.error("Visitor not found for appointment:", appointmentId);
      return res.status(404).json({ message: "Visitor not found" });
    }

    // 3. Check if a VerifyVisitor already exists to prevent duplicates
    const existing = await VerifyVisitor.findOne({
      appointmentId: appointment.appointmentId,
    });
    if (!existing) {
      // 4. Create VerifyVisitor from appointment data
      const newVerifyVisitor = new VerifyVisitor({
        appointmentId: appointment.appointmentId,
        visitorId: visitor.visitorId,
        name: `${appointment.firstname} ${appointment.lastname}`,
        nic: visitor.nicNumber, // if nic is not available in appointment, skip or improve this
        vehicleNumber: appointment.vehicle,
        host: appointment.hostId.toString(),
        purpose: appointment.reason,
        company: "N/A", // optional: get from Visitorsignup if needed
        status: "Awaiting Check-In",
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
      status: { $in: ["confirmed", "accepted", "visitorRejected", "pending", "rejected"] }
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



