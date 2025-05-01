import mongoose from "mongoose";

const staffSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: { type: String, lowercase: true }, // Ensures lowercase
  userID: String,
  faculty: String,
  department: String,
  nicNumber: String,
  registeredDate: String,
});

export default mongoose.model("Staff", staffSchema);
