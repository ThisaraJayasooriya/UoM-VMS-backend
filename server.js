import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/mongodb.js";
import cookieParser from "cookie-parser";
import visitorAuthRoutes from "./routes/visitorAuthRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import rateLimit from "express-rate-limit";
import staffRoutes from "./routes/staffRoutes.js";
import hostRoutes from "./routes/hostRoutes.js";
import verifyVisitorRoutes from "./routes/VerifyVisitorRoutes.js";
import appointmentRoutes from './routes/appoiment.routes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import visitorLogbookRoutes from './routes/visitorLogbookRoutes.js';
import hostAppointmentsRoutes from './routes/hostAppointmentsRoutes.js';
import userProfileRoutes from "./routes/userProfileRoutes.js";
import visitorRoutes from './routes/visitorRoutes.js'; 
import userRoutes from './routes/userRoutes.js';
import securityRoutes from './routes/securityRoutes.js'; // Moved here
import "./cron/autoUpdateAppointments.js";


// Load environment variables from .env file
dotenv.config();

// Log environment variables for debugging
console.log("Loaded environment variables:", {
  MONGO_URI: process.env.MONGO_URI ? "[REDACTED]" : undefined, // Added debug
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS ? "[REDACTED]" : undefined,
  CLIENT_URL: process.env.CLIENT_URL
});

const app = express();

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed", error);
  });

// Middleware
app.use(express.json());
app.use(cookieParser());

// CORS configuration
app.use(
  cors({
     origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  })
);

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later",
});

// Base route
app.get("/", (req, res) => {
  res.send("🚀 Welcome to the VMS Backend API");
});

// Auth routes mounted at /api/auth/visitor
app.use("/api/auth/visitor", authLimiter, visitorAuthRoutes);
console.log("✅ Mounted visitor auth routes at /api/auth/visitor");

// Log registered visitor auth routes
visitorAuthRoutes.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(
      `Route registered: /api/auth/visitor${r.route.path} [${Object.keys(r.route.methods).join(", ").toUpperCase()}]`
    );
  }
});

// Other routes
app.use("/api/staff", staffRoutes);
app.use("/api/verify-visitors", verifyVisitorRoutes);
app.use("/api/host", hostRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/logbook', visitorLogbookRoutes);
app.use('/api/appointments', hostAppointmentsRoutes);
app.use('/api/userProfile', userProfileRoutes);
app.use('/api/visitor', visitorRoutes); 
app.use('/api/users', userRoutes);
app.use('/api/security', securityRoutes); // Moved here

// Log feedback routes
feedbackRoutes.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(
      `Route registered: /api/feedback${r.route.path} [${Object.keys(r.route.methods).join(', ').toUpperCase()}]`
    );
  }
});

// Error handling middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
});

// Placeholder for future middleware or routes (optional)
console.log("Server setup complete.");