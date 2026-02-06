import { Request, Response } from "express";
import {
  getUpcomingBookingsForAllUsers,
  getBookingById,
  getTodayCheckIns,
  getTodayCheckOuts,
  updateBookingStatus,
  createBooking,
  checkRoomAvailability,
  rescheduleBooking,
} from "../services/booking.service.js";

// BigInt-safe serializer
const serializeBigInt = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );

export const fetchUpcomingBookingsForAllUsers = async (
  req: Request,
  res: Response,
) => {
  try {
    const bookings = await getUpcomingBookingsForAllUsers();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: serializeBigInt(bookings),
    });
  } catch (error) {
    console.error("FETCH BOOKINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
};

export const getBookingByIdController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const bookingId = BigInt(id);
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }
    return res.status(200).json({
      success: true,
      data: serializeBigInt(booking),
    });
  } catch (error) {
    console.error("GET BOOKING BY ID ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
    });
  }
};

export const fetchTodayCheckIns = async (req: Request, res: Response) => {
  try {
    const checkins = await getTodayCheckIns();

    return res.status(200).json({
      success: true,
      count: checkins.length,
      data: serializeBigInt(checkins),
    });
  } catch (error) {
    console.error("FETCH TODAY CHECKINS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's check-ins",
    });
  }
};

export const fetchTodayCheckOuts = async (req: Request, res: Response) => {
  try {
    const checkouts = await getTodayCheckOuts();

    return res.status(200).json({
      success: true,
      count: checkouts.length,
      data: serializeBigInt(checkouts),
    });
  } catch (error) {
    console.error("FETCH TODAY CHECKOUTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch today's check-outs",
    });
  }
};

export const updateBookingStatusController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const updated = await updateBookingStatus(BigInt(id), status);

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Status Updated Successfully",
    });
  } catch (error) {
    console.error("UPDATE BOOKING STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update booking status",
    });
  }
};

export const rescheduleBookingController = async (
  req: Request,
  res: Response,
) => {
  try {
    const id = req.params.id as string;
    const body = req.body;

    const room_id = Number(body.room_id);
    if (!room_id || Number.isNaN(room_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid room_id is required",
      });
    }

    if (!body.check_in || !body.check_out) {
      return res.status(400).json({
        success: false,
        message: "check_in and check_out are required",
      });
    }

    const paymentMethod = body.payment_method;
    const validMethods = ["online", "partial", "offline"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "payment_method must be one of: online, partial, offline",
      });
    }

    const adults = Number(body.adults);
    if (!adults || adults < 1 || Number.isNaN(adults)) {
      return res.status(400).json({
        success: false,
        message: "adults must be at least 1",
      });
    }

    if (!body.whatsapp_number || String(body.whatsapp_number).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "whatsapp_number is required",
      });
    }

    if (!body.guest_name || String(body.guest_name).trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "guest_name is required (at least 2 characters)",
      });
    }

    const bookingId = BigInt(id);
    const updated = await rescheduleBooking({
      booking_id: bookingId,
      room_id,
      check_in: String(body.check_in),
      check_out: String(body.check_out),
      guest_name: String(body.guest_name).trim(),
      guest_email:
        body.guest_email != null ? String(body.guest_email).trim() : undefined,
      whatsapp_number: String(body.whatsapp_number).trim(),
      adults,
      children: body.children != null ? Number(body.children) : undefined,
      payment_method: paymentMethod,
    });

    return res.status(200).json({
      success: true,
      data: serializeBigInt(updated),
      message: "Booking updated successfully",
    });
  } catch (error: unknown) {
    console.error("RESCHEDULE BOOKING ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update booking";
    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const checkAvailabilityController = async (
  req: Request,
  res: Response,
) => {
  try {
    const { room_id, check_in, check_out } = req.body;
    const roomId = Number(room_id);
    if (!roomId || Number.isNaN(roomId)) {
      return res.status(400).json({
        success: false,
        message: "Valid room_id is required",
      });
    }
    if (!check_in || !check_out) {
      return res.status(400).json({
        success: false,
        message: "check_in and check_out are required",
      });
    }
    const result = await checkRoomAvailability(
      roomId,
      String(check_in),
      String(check_out),
    );
    return res.status(200).json({
      success: true,
      available: result.available,
      message: result.message,
    });
  } catch (error) {
    console.error("CHECK AVAILABILITY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check availability",
    });
  }
};

export const createBookingController = async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const room_id = Number(body.room_id);
    if (!room_id || Number.isNaN(room_id)) {
      return res.status(400).json({
        success: false,
        message: "Valid room_id is required",
      });
    }

    const paymentMethod = body.payment_method;
    const validMethods = ["online", "partial", "offline"];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "payment_method must be one of: online, partial, offline",
      });
    }

    const adults = Number(body.adults);
    if (!adults || adults < 1 || Number.isNaN(adults)) {
      return res.status(400).json({
        success: false,
        message: "adults must be at least 1",
      });
    }

    if (!body.whatsapp_number || String(body.whatsapp_number).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "whatsapp_number is required",
      });
    }

    const user_id =
      body.user_id != null && body.user_id !== ""
        ? Number(body.user_id)
        : undefined;
    if (user_id != null && (Number.isNaN(user_id) || user_id < 1)) {
      return res.status(400).json({
        success: false,
        message: "user_id must be a positive number when provided",
      });
    }

    const booking = await createBooking({
      room_id,
      check_in: body.check_in,
      check_out: body.check_out,
      user_id,
      guest_name: body.guest_name,
      guest_email: body.guest_email,
      whatsapp_number: String(body.whatsapp_number).trim(),
      adults,
      children: body.children != null ? Number(body.children) : undefined,
      payment_method: paymentMethod,
    });

    return res.status(201).json({
      success: true,
      data: serializeBigInt(booking),
      message: "Booking created successfully",
    });
  } catch (error: unknown) {
    console.error("CREATE BOOKING ERROR:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create booking";
    return res.status(500).json({
      success: false,
      message,
    });
  }
};
