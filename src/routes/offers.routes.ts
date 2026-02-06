// server/routes/offers.routes.ts
import { Router } from "express";
import {
  createOfferHandler,
  deleteOfferHandler,
  fetchOfferById,
  fetchOffers,
  updateOfferHandler,
} from "../controllers/offers.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
const router = Router();

router.use(requireAuth);
router.get("/", fetchOffers);
router.get("/:id", fetchOfferById);
router.post("/create", createOfferHandler);
router.patch("/:id", updateOfferHandler);
router.delete("/:id", deleteOfferHandler);

export default router;
