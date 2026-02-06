import { Router } from "express";
import {
  createUser,
  loginUser,
  logoutUser,
  refreshToken,
  checkUser,
  getProfile,
  changePassword,
  listAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", createUser);
router.post("/login", loginUser);
router.post("/logout", requireAuth, logoutUser);
router.post("/refresh", refreshToken);
router.get("/me", requireAuth, checkUser);
router.get("/profile", requireAuth, getProfile);
router.post("/change-password", requireAuth, changePassword);

router.get("/admins", requireAuth, listAdmins);
router.post("/admins", requireAuth, createAdmin);
router.patch("/admins/:id", requireAuth, updateAdmin);
router.delete("/admins/:id", requireAuth, deleteAdmin);

export default router;
