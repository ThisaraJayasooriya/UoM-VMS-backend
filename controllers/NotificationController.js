import Notification from "../models/Notification.js";

// Fetch notifications for the logged-in admin
export const getNotifications = async (req, res) => {
  console.log("getNotifications called for admin:", req.user.id); // <-- Place it here
  try {
    const adminId = req.user.id; // From verifyToken in AuthController.js
    // UPDATE: Fetch all notifications for the admin without sorting
    console.log("Fetching notifications for admin ID:", adminId); // NEW: Log admin ID
    const notifications = await Notification.find({ admin: adminId }).lean(); // Simplified to fetch all
    console.log("Notifications found:", notifications); // NEW: Log notifications
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error); // NEW: Log error
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Mark a notification as read/unread (kept for potential future use)
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;
    console.log(`Updating notification ${id} to read: ${read}`); // NEW: Log update
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Error updating notification:", error); // NEW: Log error
    res.status(400).json({ success: false, message: error.message });
  }
};