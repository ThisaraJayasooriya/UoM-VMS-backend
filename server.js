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

// Load environment variables from .env file
dotenv.config();

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
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP
  message: "Too many requests from this IP, please try again later",
});

// Routes
app.get("/", (req, res) => {
  res.send("🚀 Welcome to the VMS Backend API");
});

app.use("/api/auth", authLimiter, visitorAuthRoutes); // Changed from "/api/auth/visitor" to "/api/auth"
console.log('Mounted auth routes at /api/auth');
visitorAuthRoutes.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`Full path: /api/auth${r.route.path} [${Object.keys(r.route.methods).join(", ").toUpperCase()}]`);
  }
});

app.use("/api/staff", staffRoutes);
app.use("/api/verify-visitors", verifyVisitorRoutes);
app.use("/api/host", hostRoutes);

// Error handling middleware (keep this last)
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔗 Base URL: http://localhost:${PORT}`);
});