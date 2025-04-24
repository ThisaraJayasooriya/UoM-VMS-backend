// models/Staff.js
import mongoose from "mongoose";

const staffSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
  userID: String,
  faculty: String,
  department: String,
  nicNumber: String, // ✅ Added NIC / Passport No
  registeredDate: String,
});

export default mongoose.model("Staff", staffSchema);
