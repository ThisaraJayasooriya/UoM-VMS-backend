import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", required: true }, // Reference to Staff model (admins)
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;