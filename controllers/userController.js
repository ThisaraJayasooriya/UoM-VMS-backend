import Staff from "../models/Staff.js";

import VisitorSignup from "../models/VisitorSignup.js";
  
  export const getUserCounts = async (req, res) => {
    // This function retrieves counts of different user roles and visitor signups
    try {
        // Using Promise.all to run all counts concurrently for better performance
      const [adminCount, hostCount, securityCount, visitorCount] = await Promise.all([
        Staff.countDocuments({ role: "admin" }),
        Staff.countDocuments({ role: "host" }),
        Staff.countDocuments({ role: "security" }),
        VisitorSignup.countDocuments()
      ]);

       // If all counts succeed, return them in a JSON response with success = true
      res.status(200).json({
        success: true,
        data: {
          admins: adminCount,
          hosts: hostCount,
          security: securityCount,
          visitors: visitorCount
        }
      });
    } catch (error) {
         // If there’s an error (e.g., database issue), log it and return a failure message
      console.error("Error fetching user counts:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user counts" });
    }
  };