import { Router } from "express";
import { getReports } from "../controllers/reports.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);
router.get("/summary", getReports);

export default router;
