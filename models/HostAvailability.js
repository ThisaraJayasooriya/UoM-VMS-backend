import mongoose from "mongoose";

const HostAvailabilitySchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true }, // Format: YYYY-MM-DD
    startTime: { type: String, required: true }, // Format: HH:mm
    endTime: { type: String, required: true }, // Format: HH:mm
    status: { type: String, enum: ["available", "booked"], default: "available" },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create a compound index to prevent duplicate time slots
HostAvailabilitySchema.index({ hostId: 1, date: 1, startTime: 1, endTime: 1 }, { unique: true });

export default mongoose.model("HostAvailability", HostAvailabilitySchema);