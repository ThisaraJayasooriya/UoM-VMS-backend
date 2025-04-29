import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  visitorId: { type: String, required: true },
  name: { type: String, required: true },
  action: { type: String, enum: ["Checked-In", "Checked-Out"], required: true },
  timestamp: { type: Date, default: Date.now },
});

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;