import { Router } from "express";
import {
  fetchUsers,
  addUser,
  editUser,
  admin as keerthana,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(requireAuth);
router.get("/users", fetchUsers);
router.post("/add", addUser);
router.put("/update/:id", editUser);
router.get("/all", keerthana);

export default router;
