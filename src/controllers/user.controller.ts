import { Request, Response } from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
} from "../services/user.service.js";

import { prisma } from "../db/prisma.js";

export const fetchUsers = async (req: Request, res: Response) => {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

export const addUser = async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      const field = error.meta.target[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add user",
    });
  }
};

export const editUser = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const user = await updateUser(userId, req.body);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      const field = error.meta.target[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
};

export const admin = async (req: Request, res: Response) => {
  try {
    const adminuser = await prisma.admin.findMany({});
    return res.status(200).json({ adminuser });
  } catch (error) {
    return res.status(500).json({ message: error });
  }
};
