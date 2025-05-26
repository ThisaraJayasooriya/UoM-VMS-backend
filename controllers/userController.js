import Staff from "../models/Staff.js";
  import VisitorSignup from "../models/VisitorSignup.js";

  export const getUserCounts = async (req, res) => {
    try {
      const [adminCount, hostCount, securityCount, visitorCount] = await Promise.all([
        Staff.countDocuments({ role: "admin" }),
        Staff.countDocuments({ role: "host" }),
        Staff.countDocuments({ role: "security" }),
        VisitorSignup.countDocuments()
      ]);

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
      console.error("Error fetching user counts:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user counts" });
    }
  };