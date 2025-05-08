import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load .env file
dotenv.config({ path: 'E:/UoM-VMS-backend/.env' });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Debug log to verify environment
console.log("Email configuration check in sendEmail.js:", {
  cwd: process.cwd(),
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS ? "[REDACTED]" : undefined,
  CLIENT_URL: process.env.CLIENT_URL,
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"UoM Visitor Management System" <${process.env.EMAIL_USER || 'no-email@set.com'}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.response}`);
    return { success: true, message: "Email sent successfully", info };
  } catch (error) {
    console.error(`Failed to send email to ${to}: ${error.message}`, error.stack);
    return { success: false, message: "Failed to send email", error: error.message };
  }
};

export default sendEmail;