import Appointment from "../models/Appoinment.js";
import Staff from '../models/Staff.js';

export const makeAppoinment = async (req, res) => {
    console.log("Received request to create appointment:", req.body);
  try {
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
    res.status(201).json({ message: "Appoinment created successfully", appoinment });
  } catch (error) {
    console.error("Error creating appoinment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAppoinments = async (req, res) => {
  try {
    const appoinments = await Appointment.find();
    res.status(200).json(appoinments);
  } catch (error) {
    console.error("Error fetching appoinments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

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


export const getAllHosts = async (req, res) => {
  try {
    const hosts = await Staff.find({ role: 'host' }).select('name _id');
    res.status(200).json(hosts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hosts', error });
  }
};
