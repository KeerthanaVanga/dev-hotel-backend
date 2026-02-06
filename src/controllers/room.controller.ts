import { Request, Response } from "express";
import {
  getAllRooms,
  createRoom,
  updateRoomById,
} from "../services/room.service.js";
import { uploadBufferToCloudinary } from "../utils/cloudinaryUpload.js";

// BigInt-safe serializer
const serializeBigInt = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );

export const fetchAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await getAllRooms();

    return res.status(200).json({
      success: true,
      count: rooms.length,
      data: serializeBigInt(rooms),
    });
  } catch (error) {
    console.error("FETCH ROOMS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch rooms",
    });
  }
};

export const addRoom = async (req: Request, res: Response) => {
  try {
    const {
      room_name,
      room_type,
      room_number,
      price,
      description,
      total_rooms,
      guests,
      room_size,
      amenities,
    } = req.body;

    const files = (req.files as Express.Multer.File[]) || [];

    // ✅ Upload to Cloudinary
    const image_urls = await Promise.all(
      files.map((f) => uploadBufferToCloudinary(f.buffer, "hotel/rooms")),
    );

    const room = await createRoom({
      room_name,
      room_type,
      room_number: Number(room_number),
      price: Number(price),
      description,
      image_urls,
      total_rooms: Number(total_rooms),
      guests: Number(guests),
      room_size,
      amenities: JSON.parse(amenities),
    });

    return res.status(201).json({
      success: true,
      data: serializeBigInt(room),
    });
  } catch (error) {
    console.error("ADD ROOM ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add room",
    });
  }
};

export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;

    const {
      room_name,
      room_type,
      price,
      description,
      guests,
      room_size,
      amenities,
      existing_images,
    } = req.body;

    const files = (req.files as Express.Multer.File[]) || [];

    // ✅ Upload new images to Cloudinary
    const newImageUrls = await Promise.all(
      files.map((f) => uploadBufferToCloudinary(f.buffer, "hotel/rooms")),
    );

    const finalImages = [
      ...JSON.parse(existing_images || "[]"),
      ...newImageUrls,
    ];

    // ✅ DO NOT update room_number / total_rooms
    const updatedRoom = await updateRoomById(roomId, {
      room_name,
      room_type,
      price: Number(price),
      description,
      image_urls: finalImages,
      guests: Number(guests),
      room_size,
      amenities: JSON.parse(amenities),
    });

    return res.status(200).json({
      success: true,
      data: serializeBigInt(updatedRoom),
    });
  } catch (error) {
    console.error("UPDATE ROOM ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update room",
    });
  }
};
