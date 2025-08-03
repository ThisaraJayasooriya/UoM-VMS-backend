import mongoose from "mongoose";

const visitorReportSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      ref: "Appointment",
      required: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Host",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    visitorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    visitorName: {
      type: String,
      required: true,
    },
    visitorEmail: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const VisitorReport = mongoose.model("VisitorReport", visitorReportSchema);
export default VisitorReport;