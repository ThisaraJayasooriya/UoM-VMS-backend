  import mongoose from "mongoose";

  const appointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, unique: true },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VisitorSignup",
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
      enum: ["pending", "accepted", "rejected" , "confirmed", "visitorRejected", "hostRejected", "Completed", "Incompleted"],
      default: "pending",
    },
    response: {
      date: String,
      startTime: String,
      endTime: String,
      responseType: String, // "allSlots" or "exactSlot"
    },
    availableTimeSlots: [{
      slotId: String,
      date: String,
      startTime: String,
      endTime: String,
    }],
    selectedTimeSlot: {
      slotId: String,
      date: String,
      startTime: String,
      endTime: String,
    },
  });

  const Appointment = mongoose.model("Appointment", appointmentSchema);
  export default Appointment;
    