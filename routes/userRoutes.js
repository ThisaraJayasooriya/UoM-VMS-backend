import express from "express";
  import { getUserCounts } from "../controllers/userController.js";

  const router = express.Router();
// GET: Get user counts
  router.get("/counts", getUserCounts);

  export default router;
