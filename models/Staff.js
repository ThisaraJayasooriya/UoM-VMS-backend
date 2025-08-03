import mongoose from "mongoose";
import bcrypt from "bcrypt"; // Import bcrypt for password hashing

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, unique: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true, default: "" },
  password: {
    type: String,
    required: true,
    select: false,
    validate: {
      validator: function (value) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(value);
      },
      message: "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character",
    },
  },
  role: { type: String, required: true, lowercase: true, trim: true },
  userID: { type: String, required: true, trim: true, unique: true },
  faculty: { type: String, trim: true, default: "" },
  department: { type: String, trim: true, default: "" },
  nicNumber: { type: String, trim: true, default: "", sparse: true },
  registeredDate: { type: Date, default: () => new Date() },
  status: { type: String, enum: ["active", "blocked"], default: "active" }, // Updated to enum
  blockedOn: { type: Date, default: null }, // Added for blocking timestamp
  reason: { type: String, default: null }, // Added for blocking reason
  resetPasswordToken: { type: String }, // Added for password reset compatibility
  resetPasswordExpires: { type: Date }, // Added for password reset compatibility
});

// Hash password before saving
staffSchema.pre("save", async function (next) {
  if (this.skipPasswordHash || !this.isModified("password")) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add a method to compare passwords (for consistency with VisitorSignup.js)
staffSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export default mongoose.model("Staff", staffSchema);