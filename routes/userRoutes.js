import express from "express";
  import { getUserCounts } from "../controllers/userController.js";

  const router = express.Router();

  router.get("/counts", getUserCounts);

  export default router;