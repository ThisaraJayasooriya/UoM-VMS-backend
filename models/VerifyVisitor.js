import mongoose from "mongoose";

const verifyVisitorSchema = new mongoose.Schema({
  appointmentId: {
    type: String, 
    required: true
  },
  visitorId: {
    type: String,
    required: true,
    
  },
  name: { type: String, required: true },
  nic: { type: String, required: true },
  vehicleNumber: { type: String },
  hostId: { type: String, required: true },
  purpose: { type: String },
  checkInTime: { type: Date },
  checkOutTime: { type: Date },
  status: {
    type: String,
    enum: ["Awaiting Check-In", "Checked-In", "Checked-Out"],
    default: "Awaiting Check-In",
  },
  date: {type: String, required: true}
}, { timestamps: true });

const VerifyVisitor = mongoose.model("VerifyVisitor", verifyVisitorSchema);

export default VerifyVisitor;