import { Router } from "express";
import {
  fetchAllRooms,
  addRoom,
  updateRoom,
} from "../controllers/room.controller.js";
import { upload } from "../middlewares/upload.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);
router.get("/rooms", fetchAllRooms);
router.post("/rooms", upload.array("images"), addRoom);
router.put("/rooms/:roomId", upload.array("images"), updateRoom);

export default router;
