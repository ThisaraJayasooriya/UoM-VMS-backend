import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  contact: String,
  host: String,
  vehicle: String,
  category: String,
  reason: String,
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
