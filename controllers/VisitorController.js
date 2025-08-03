import VisitorSignup from "../models/VisitorSignup.js";

// Fetch all visitors
export const getVisitors = async (req, res) => {
  try {
    const visitors = await VisitorSignup.find().select("-password -resetPasswordToken -resetPasswordExpires");
    res.status(200).json({ success: true, data: visitors });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Update a visitor
export const updateVisitor = async (req, res) => {
  try {
    const updatedVisitor = await VisitorSignup.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });
    if (!updatedVisitor) return res.status(404).json({ success: false, message: "Visitor not found" });
    res.status(200).json({ success: true, data: updatedVisitor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete a visitor
export const deleteVisitor = async (req, res) => {
  try {
    const deletedVisitor = await VisitorSignup.findByIdAndDelete(req.params.id);
    if (!deletedVisitor) return res.status(404).json({ success: false, message: "Visitor not found" });
    res.status(200).json({ success: true, message: "Visitor deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};