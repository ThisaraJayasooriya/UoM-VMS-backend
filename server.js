// server.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/mongodb.js"; // This is your DB config file
import cookieParser from "cookie-parser";
import visitorRoutes from "./routes/visitorRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";

dotenv.config(); // Load .env file

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Sample Route
app.get("/", (req, res) => {
  res.send("🚀 Welcome to the VMS Backend!");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

app.use("/api/auth", visitorRoutes);

app.use("/api/staff", staffRoutes);