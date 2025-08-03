import HostAvailability from "../models/HostAvailability.js";

// Add availability slots
export const addAvailability = async (req, res) => {
    try {
        const { hostId, date, startTime, endTime, status } = req.body;

        // Validate required fields
        if (!hostId || !date || !startTime || !endTime) {
            return res.status(400).json({ 
                message: "Missing required fields", 
                requiredFields: ['hostId', 'date', 'startTime', 'endTime'] 
            });
        }

        const availability = new HostAvailability({ hostId, date, startTime, endTime, status });
        await availability.save();
        res.status(201).json({ message: "Availability added successfully", availability });
    } catch (error) {
        console.error("Error adding availability:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get availability for a host
export const getAvailability = async (req, res) => {
    try {
        const { hostId } = req.params;
        
        if (!hostId) {
            return res.status(400).json({ message: "Host ID is required" });
        }
        
        const availability = await HostAvailability.find({ hostId });
        res.json(availability);
    } catch (error) {
        console.error("Error fetching availability:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Delete a specific time slot
export const deleteSlot = async (req, res) => {
    try {
        const { availabilityId } = req.params;
        
        if (!availabilityId) {
            return res.status(400).json({ message: "Availability ID is required" });
        }
        
        const availability = await HostAvailability.findById(availabilityId);
        if (!availability) {
            return res.status(404).json({ message: "Availability not found" });
        }

        // Remove the slot
        await availability.deleteOne();
        res.json({ message: "Time slot deleted successfully", availability });
    } catch (error) {
        console.error("Error deleting availability:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};