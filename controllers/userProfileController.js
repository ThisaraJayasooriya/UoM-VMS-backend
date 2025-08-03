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

export const updateProfileData = async (req, res) => {
  const userId = req.params.userId;
  const { firstName, lastName, email, phoneNumber, nicNumber, passportNumber } = req.body;

  try {
    let user = await Staff.findById(userId);
    let isStaff = true;

    if (!user) {
      user = await VisitorSignup.findById(userId);
      isStaff = false;
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields based on user type
    if (isStaff) {
      // For staff members
      if (firstName && lastName) {
        user.name = `${firstName} ${lastName}`;
      }
      if (email) user.email = email;
      if (phoneNumber) user.phone = phoneNumber;
      if (nicNumber) user.nicNumber = nicNumber;
    } else {
      // For visitors
      if (firstName) user.firstName = firstName;
      if (lastName) user.lastName = lastName;
      if (email) user.email = email;
      if (phoneNumber) user.phoneNumber = phoneNumber;
      if (nicNumber) user.nicNumber = nicNumber;
      if (passportNumber) user.passportNumber = passportNumber;
    }

    await user.save();

    res.status(200).json({ 
      success: true, 
      message: "Profile updated successfully", 
      user: user 
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    
    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field} already exists. Please use a different ${field}.` 
      });
    }
    
    res.status(500).json({ message: "Error updating profile data", error });
  }
};