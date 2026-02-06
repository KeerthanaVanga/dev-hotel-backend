import { Router } from "express";
import { fetchAllReviews } from "../controllers/review.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);
router.get("/reviews", fetchAllReviews);

export default router;
