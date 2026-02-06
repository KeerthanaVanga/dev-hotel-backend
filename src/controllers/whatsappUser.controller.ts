import { Request, Response } from "express";
import { prisma } from "../db/prisma";
import { serializeBigInt } from "../utils/serializeBigint.js";

export const fetchWhatsappUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.$queryRaw<
      {
        name: string | null;
        phone: string;
        sender_type: string;
        last_message: string;
        created_at: Date;
      }[]
    >`
    SELECT DISTINCT ON (fromnumber)
      name,
      fromnumber AS phone,
      sender_type,
      message AS last_message,
      created_at
    FROM "whatsapp_messages"
    WHERE sender_type = 'user'
    ORDER BY fromnumber, created_at DESC
  `;
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch WhatsApp users",
    });
  }
};

export const fetchWhatsappMessages = async (req: Request, res: Response) => {
  try {
    const phone = req.params.phone as string;

    const messages = await prisma.whatsapp_messages.findMany({
      where: {
        OR: [{ fromnumber: phone }, { tonumber: phone }],
      },
      orderBy: {
        created_at: "asc",
      },
      select: {
        id: true,
        message: true,
        sender_type: true,
        created_at: true,
      },
    });

    res.json({
      success: true,
      data: serializeBigInt(messages),
    });
  } catch (error) {
    console.error("Fetch messages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
};
