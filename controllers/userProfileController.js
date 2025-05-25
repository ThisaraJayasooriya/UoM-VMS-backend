import Staff from "../models/Staff.js";
import VisitorSignup from "../models/VisitorSignup.js";

export const getProfileData = async (req, res) => {
  const userId = req.params.userId;

  try {
    let user = await Staff.findById(userId);

    if (!user) {
      user = await VisitorSignup.findById(userId);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Error fetching profile data", error });
  }
};