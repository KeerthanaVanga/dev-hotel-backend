import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies.js";
import { AuthRequest } from "../middlewares/auth.middleware.js";

/* ================= REGISTER ================= */
export const createUser = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existingUser = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.admin.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.admin.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("CREATE USER ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= LOGIN ================= */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await prisma.admin.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.admin.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= LOGOUT ================= */
export const logoutUser = async (req: AuthRequest, res: Response) => {
  try {
    if (req.userId) {
      await prisma.admin.update({
        where: { id: req.userId },
        data: { refreshToken: null },
      });
    }

    clearAuthCookies(res);

    return res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("LOGOUT ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= REFRESH TOKEN ================= */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as {
      userId: number;
    };

    const user = await prisma.admin.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const newAccessToken = generateAccessToken(user.id);

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Token refreshed",
    });
  } catch (error) {
    console.error("REFRESH TOKEN ERROR:", error);
    return res.status(403).json({
      message: "Invalid refresh token",
    });
  }
};

/* ================= CHECK USER ================= */
export const checkUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.admin.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("CHECK USER ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= GET PROFILE (admin table) ================= */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdat: true,
        updatedat: true,
      },
    });

    if (!admin) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.status(200).json({
      profile: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        createdAt: admin.createdat,
        updatedAt: admin.updatedat,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= CHANGE PASSWORD ================= */
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: req.userId },
    });

    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: req.userId },
      data: { password: hashedPassword },
    });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= LIST ADMINS ================= */
export const listAdmins = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdat: true,
      },
      orderBy: { id: "asc" },
    });

    return res.status(200).json({
      admins: admins.map((a: (typeof admins)[number]) => ({
        id: a.id,
        username: a.username,
        email: a.email,
        createdAt: a.createdat,
      })),
    });
  } catch (error) {
    console.error("LIST ADMINS ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= CREATE ADMIN ================= */
export const createAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "Username, email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existing = await prisma.admin.findUnique({
      where: { email },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "An admin with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: { username, email, password: hashedPassword },
      select: { id: true, username: true, email: true },
    });

    return res.status(201).json({
      message: "Admin created successfully",
      admin: { id: admin.id, username: admin.username, email: admin.email },
    });
  } catch (error) {
    console.error("CREATE ADMIN ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= UPDATE ADMIN ================= */
export const updateAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }

    const { username, email, password } = req.body;

    const data: { username?: string; email?: string; password?: string } = {};
    if (username !== undefined) data.username = username;
    if (email !== undefined) data.email = email;
    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }
      data.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    if (email) {
      const existing = await prisma.admin.findFirst({
        where: { email, id: { not: id } },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "An admin with this email already exists" });
      }
    }

    const admin = await prisma.admin.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true },
    });

    return res.status(200).json({
      message: "Admin updated successfully",
      admin: { id: admin.id, username: admin.username, email: admin.email },
    });
  } catch (error) {
    if ((error as any)?.code === "P2025") {
      return res.status(404).json({ message: "Admin not found" });
    }
    console.error("UPDATE ADMIN ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/* ================= DELETE ADMIN ================= */
export const deleteAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid admin ID" });
    }

    if (id === req.userId) {
      return res
        .status(400)
        .json({ message: "You cannot delete your own account" });
    }

    await prisma.admin.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Admin deleted successfully" });
  } catch (error) {
    if ((error as any)?.code === "P2025") {
      return res.status(404).json({ message: "Admin not found" });
    }
    console.error("DELETE ADMIN ERROR:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
