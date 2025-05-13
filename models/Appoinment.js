import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  visitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Visitorsignup",
    required: true,
  },

  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true },

  
  vehicle: { type: String},
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  contact: { type: String, required: true },
  category: { type: String, required: true },
  reason: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  response: {
    respondedAt: Date,
    responseMessage: String,
    timeSlot: {
      startTime: Date,
      endTime: Date,
    },
  },
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
export default Appointment;
