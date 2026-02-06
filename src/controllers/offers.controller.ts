// server/controllers/offers.controller.ts
import { Request, Response } from "express";
import {
  createOffer,
  deleteOffer,
  getAllOffers,
  getOfferById,
  updateOffer,
} from "../services/offers.service.js";
import { prisma } from "../db/prisma.js";

/** GET /offers */
export const fetchOffers = async (_req: Request, res: Response) => {
  try {
    const offers = await getAllOffers();
    return res.status(200).json({ success: true, data: offers });
  } catch (error) {
    console.error("FETCH OFFERS ERROR:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch offers" });
  }
};

/** GET /offers/:id */
export const fetchOfferById = async (req: Request, res: Response) => {
  const offerId = Number(req.params.id);
  if (Number.isNaN(offerId)) {
    return res.status(400).json({ message: "Invalid offer id" });
  }

  try {
    const offer = await getOfferById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }
    return res.json({ success: true, data: offer });
  } catch (error) {
    console.error("FETCH OFFER ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch offer" });
  }
};

/** POST /offers */
export const createOfferHandler = async (req: Request, res: Response) => {
  const {
    title,
    room_id,
    discount_percent,
    offer_price,
    start_date,
    end_date,
    is_active,
  } = req.body;

  if (!room_id || !discount_percent) {
    return res.status(400).json({
      message: "room_id and discount_percent are required",
    });
  }

  try {
    const room = await prisma.rooms.findFirst({
      where: { room_id },
      select: { room_id: true },
    });

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const created = await createOffer({
      title: title,
      room_id: room.room_id,
      discount_percent: Number(discount_percent),
      offer_price:
        offer_price != null && offer_price !== "" ? Number(offer_price) : null,
      start_date: start_date ? new Date(start_date) : null,
      end_date: end_date ? new Date(end_date) : null,
      is_active: is_active ?? true,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);
    return res.status(500).json({ message: "Failed to create offer" });
  }
};

/** PATCH /offers/:id */
export const updateOfferHandler = async (req: Request, res: Response) => {
  const offerId = Number(req.params.id);
  if (Number.isNaN(offerId)) {
    return res.status(400).json({ message: "Invalid offer id" });
  }

  const {
    title,
    room_id,
    discount_percent,
    offer_price,
    start_date,
    end_date,
    is_active,
  } = req.body;

  try {
    let resolvedRoomId: number | undefined;

    if (room_id != null) {
      const room = await prisma.rooms.findFirst({
        where: { room_id },
        select: { room_id: true },
      });

      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      resolvedRoomId = room.room_id;
    }

    const updated = await updateOffer(offerId, {
      ...(resolvedRoomId !== undefined ? { room_id: resolvedRoomId } : {}),
      ...(discount_percent !== undefined
        ? { discount_percent: Number(discount_percent) }
        : {}),
      ...(offer_price !== undefined
        ? {
            offer_price:
              offer_price == null || offer_price === ""
                ? null
                : Number(offer_price),
          }
        : {}),
      ...(start_date !== undefined
        ? { start_date: start_date ? new Date(start_date) : null }
        : {}),
      ...(end_date !== undefined
        ? { end_date: end_date ? new Date(end_date) : null }
        : {}),
      ...(is_active !== undefined ? { is_active: Boolean(is_active) } : {}),
      ...(title !== undefined ? { title } : {}),
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("UPDATE OFFER ERROR:", error);
    return res.status(500).json({ message: "Failed to update offer" });
  }
};

/** DELETE /offers/:id */
export const deleteOfferHandler = async (req: Request, res: Response) => {
  const offerId = Number(req.params.id);
  if (Number.isNaN(offerId)) {
    return res.status(400).json({ message: "Invalid offer id" });
  }

  try {
    await deleteOffer(offerId);
    return res.status(204).send();
  } catch (error) {
    console.error("DELETE OFFER ERROR:", error);
    return res.status(500).json({ message: "Failed to delete offer" });
  }
};
