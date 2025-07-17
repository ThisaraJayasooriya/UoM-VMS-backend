import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },     // Notification text
    type: {                                       // Category (visitor, staff, block)
      type: String,
      enum: ["visitor", "staff", "block", "general"],
      default: "general",
    },
    read: { type: Boolean, default: false },       // Read/unread state
    timestamp: { type: Date, default: Date.now },  // When created
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
