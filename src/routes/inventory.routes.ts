import { Router } from "express";
import {
  searchInventory,
  inventoryDetails,
} from "../controllers/inventory.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);
router.get("/search", searchInventory);
router.get("/details/:propertyToken", inventoryDetails);

export default router;
