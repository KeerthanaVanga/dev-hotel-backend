import { Router } from "express";
import {
  fetchAllUsersPayments,
  updatePaymentHandler,
} from "../controllers/payment.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
const router = Router();

// Admin-style endpoint
router.use(requireAuth);
router.get("/payments", fetchAllUsersPayments);
router.patch("/payments/:id", updatePaymentHandler);

export default router;
