import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";
import {
  fetchUpcomingBookingsForAllUsers,
  getBookingByIdController,
  fetchTodayCheckOuts,
  fetchTodayCheckIns,
  updateBookingStatusController,
  createBookingController,
  checkAvailabilityController,
  rescheduleBookingController,
} from "../controllers/booking.controller.js";

const router = Router();
router.use(requireAuth);
router.get("/checkins", fetchTodayCheckIns);
router.get("/checkouts", fetchTodayCheckOuts);
router.get("/upcoming", fetchUpcomingBookingsForAllUsers);
router.get("/:id", getBookingByIdController);
router.post("/check-availability", checkAvailabilityController);
router.post("/", createBookingController);
router.patch("/:id/status", updateBookingStatusController);
router.patch("/:id/reschedule", rescheduleBookingController);

export default router;
