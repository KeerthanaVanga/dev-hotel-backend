import { Request, Response } from "express";
import {
  searchHotels,
  getHotelDetails,
} from "../services/inventory.service.js";

export const searchInventory = async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const checkIn = req.query.checkIn as string | undefined;
    const checkOut = req.query.checkOut as string | undefined;
    const adults = req.query.adults ? Number(req.query.adults) : 2;

    if (!q) return res.status(400).json({ message: "Query (q) is required" });

    const data = await searchHotels(q, checkIn, checkOut, adults);
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};

export const inventoryDetails = async (req: Request, res: Response) => {
  try {
    const propertyToken = req.params.propertyToken as string;
    const q = req.query.q as string;
    const checkIn = req.query.checkIn as string | undefined;
    const checkOut = req.query.checkOut as string | undefined;
    const adults = req.query.adults ? Number(req.query.adults) : 2;

    if (!propertyToken) {
      return res.status(400).json({ message: "propertyToken is required" });
    }
    if (!q) return res.status(400).json({ message: "q is required" });

    const data = await getHotelDetails({
      q,
      propertyToken,
      checkIn,
      checkOut,
      adults,
    });

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Server error" });
  }
};
