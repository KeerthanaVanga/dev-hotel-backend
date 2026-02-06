import { Router } from "express";
import { fetchWhatsappUsers } from "../controllers/whatsappUser.controller.js";
import { fetchWhatsappMessages } from "../controllers/whatsappUser.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);
router.get("/users", fetchWhatsappUsers);
router.get("/messages/:phone", fetchWhatsappMessages);
export default router;
