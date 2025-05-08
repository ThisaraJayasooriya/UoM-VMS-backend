import mongoose from "mongoose";
import bcrypt from "bcrypt";

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, unique: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  password: { type: String, required: true, select: false },
  role: { type: String, required: true, lowercase: true, trim: true },
  userID: { type: String, required: true, trim: true },
  faculty: { type: String, trim: true, default: "" },
  department: { type: String, trim: true, default: "" },
  nicNumber: { type: String, trim: true, default: "" },
  registeredDate: { type: Date, default: () => new Date() },
  status: { type: String, default: "active" },
});

// Ensure unique combination of email and role
staffSchema.index({ email: 1, role: 1 }, { unique: true });

// Hash password before saving
staffSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

export default mongoose.model("Staff", staffSchema);