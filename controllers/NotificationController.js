import Notification from "../models/Notification.js";

/**
 * ✅ Fetch all notifications (supports pagination)
 */
export const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Notification.countDocuments();

    res.status(200).json({
      success: true,
      total,
      page,
      limit,
      data: notifications,
    });
  } catch (error) {
    console.error("❌ Failed to fetch notifications:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
    });
  }
};

/**
 * ✅ Mark a notification as read/unread
 */
export const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("❌ Failed to update notification:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * ✅ Delete a notification
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("❌ Failed to delete notification:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
   export const getLatestNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 }) // newest first
      .limit(5); // only 5

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch latest notifications" });
  }
};
/**
 * ✅ Helper function to create notifications from other controllers
 */
export const createNotification = async (message, type = "general") => {
  try {
    const notification = await Notification.create({
      message,
      type,
      read: false,
      timestamp: new Date(),
    });
    console.log("✅ Notification created:", notification.message);
    return notification;
  } catch (error) {
    console.error("❌ Failed to create notification:", error.message);
    return null;
  }
};
