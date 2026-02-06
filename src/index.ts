import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import roomRoutes from "./routes/room.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import offerRoutes from "./routes/offers.routes.js";
import reportRoutes from "./routes/reports.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import whatsappRoutes from "./routes/whatsapp.routes.js";

import "dotenv/config";

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://hotel-frontend-kbhksla5k-keerthana-vangas-projects.vercel.app",
  "https://hotel-frontend-zeta-one.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/bookings", bookingRoutes);
app.use("/rooms", roomRoutes);
app.use("/payment", paymentRoutes);
app.use("/reviews", reviewRoutes);
app.use("/offers", offerRoutes);
app.use("/reports", reportRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/whatsapp", whatsappRoutes);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "healthy", uptime: process.uptime() });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
