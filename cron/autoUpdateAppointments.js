import cron from "node-cron";
import Appointment from "../models/Appoinment.js";

console.log("✅ Appointment cron file loaded");

// ⏱️ Run every 1 minute for testing (change to "0 0 * * *" for midnight later)
const task = cron.schedule("0 0 * * *", async () => {
  console.log(`[${new Date().toISOString()}] 🔄 Cron job started...`);

  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // e.g., '2025-07-12'

    const appointments = await Appointment.find({
      status: "confirmed",
      "response.date": { $exists: true, $ne: "" }
    });

    let updatedCount = 0;

    for (const appointment of appointments) {
      const responseDateStr = appointment.response.date;

      if (responseDateStr < todayStr) {
        appointment.status = "Incompleted";
        await appointment.save();
        updatedCount++;
        console.log(`✅ Appointment ${appointment._id} updated to 'Incompleted'`);
      }
    }

    console.log(`✅ Auto-update complete: ${updatedCount} appointments updated.`);
  } catch (error) {
    console.error("❌ Error in auto-update cron job:", error);
  }
});

// ✅ Explicitly start the cron task
task.start();
console.log("✅ Appointment cron job scheduled and started.");
