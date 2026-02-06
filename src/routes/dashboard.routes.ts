import { Router } from "express";
import { fetchDashboardSummary } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
const router = Router();
router.use(requireAuth);
router.get("/summary", fetchDashboardSummary);

export default router;
