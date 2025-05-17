import Staff from "../models/Staff.js";

export const getProfileData = async (req, res) => {
  const userId = req.params.userId;

  try {
    const staff = await Staff.findById(userId);

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    res.status(200).json(staff);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile data", error });
  }
};
