import { prisma } from "../db/prisma";

export const getUpcomingBookingsForAllUsers = async () => {
  // 1️⃣ Fetch all users
  const users = await prisma.users.findMany({
    select: {
      user_id: true,
    },
  });

  if (!users.length) {
    return [];
  }

  // 2️⃣ Extract user IDs
  const userIds = users.map((user) => user.user_id);

  // 3️⃣ Calculate start of today in IST → UTC
  const now = new Date();

  const startOfTodayIST = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );

  // IST offset = +5:30
  const startOfTodayUTC = new Date(
    startOfTodayIST.getTime() - 5.5 * 60 * 60 * 1000,
  );

  // 4️⃣ Fetch bookings
  return prisma.bookings.findMany({
    where: {
      user_id: {
        in: userIds,
      },
      check_in: {
        gte: startOfTodayUTC,
      },
    },
    orderBy: {
      check_in: "asc",
    },
    include: {
      users: {
        select: {
          user_id: true,
          name: true,
          email: true,
        },
      },
      rooms: {
        select: {
          room_id: true,
          room_name: true,
          room_type: true,
          room_number: true,
          price: true,
        },
      },
    },
  });
};

export const getBookingById = async (bookingId: bigint) => {
  const booking = await prisma.bookings.findUnique({
    where: { booking_id: bookingId },
    include: {
      users: {
        select: {
          user_id: true,
          name: true,
          email: true,
          whatsapp_number: true,
        },
      },
      rooms: {
        select: {
          room_id: true,
          room_name: true,
          room_type: true,
          room_number: true,
          price: true,
        },
      },
      payments: {
        take: 1,
        orderBy: { created_at: "desc" },
        select: { method: true },
      },
    },
  });
  return booking;
};

export const getTodayCheckIns = async () => {
  // Get today's date in YYYY-MM-DD (Asia/Kolkata safe)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return prisma.bookings.findMany({
    where: {
      check_in: {
        gte: today,
        lt: tomorrow,
      },
      status: {
        not: "cancelled",
      },
    },
    include: {
      users: {
        select: {
          user_id: true,
          name: true,
        },
      },
      rooms: {
        select: {
          room_id: true,
          room_name: true,
        },
      },
    },
    orderBy: {
      check_in: "asc",
    },
  });
};

export const getTodayCheckOuts = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  return prisma.bookings.findMany({
    where: {
      OR: [
        // Today's check-outs
        {
          check_out: {
            gte: today,
            lt: tomorrow,
          },
        },
        // Overstayed
        {
          check_out: {
            lt: today,
          },
          status: {
            not: "checked out",
          },
        },
      ],
      status: {
        not: "cancelled",
      },
    },
    include: {
      users: {
        select: {
          name: true,
        },
      },
      rooms: {
        select: {
          room_name: true,
        },
      },
    },
    orderBy: {
      check_out: "asc",
    },
  });
};

export const updateBookingStatus = async (
  bookingId: bigint,
  status: string,
) => {
  return prisma.bookings.update({
    where: {
      booking_id: bookingId,
    },
    data: {
      status,
    },
  });
};

export type RescheduleBookingInput = {
  booking_id: bigint;
  room_id: number;
  check_in: string;
  check_out: string;
  guest_name: string;
  guest_email?: string;
  whatsapp_number: string;
  adults: number;
  children?: number;
  payment_method: "online" | "partial" | "offline";
};

/**
 * Update an existing booking with all details (room, dates, guest, payment).
 * Validates room availability for the new room/dates (excluding this booking).
 */
export const rescheduleBooking = async (input: RescheduleBookingInput) => {
  const booking = await prisma.bookings.findUnique({
    where: { booking_id: input.booking_id },
    select: { room_id: true, status: true, user_id: true },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.status === "cancelled") {
    throw new Error("Cannot reschedule a cancelled booking");
  }

  const newCheckIn = new Date(input.check_in);
  const newCheckOut = new Date(input.check_out);
  if (newCheckOut <= newCheckIn) {
    throw new Error("Check-out must be after check-in");
  }

  const room = await prisma.rooms.findUnique({
    where: { room_id: input.room_id },
    select: { room_id: true, total_rooms: true, price: true },
  });
  if (!room) {
    throw new Error("Room not found");
  }

  const totalRooms = room.total_rooms != null ? Number(room.total_rooms) : 1;
  const overlappingBookings = await prisma.bookings.count({
    where: {
      room_id: input.room_id,
      booking_id: { not: input.booking_id },
      status: { not: "cancelled" },
      check_in: { lt: newCheckOut },
      check_out: { gt: newCheckIn },
    },
  });

  if (overlappingBookings >= totalRooms) {
    throw new Error(
      "This room has no availability for the selected dates. Please choose different dates.",
    );
  }

  const nights = Math.ceil(
    (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 60 * 60 * 24),
  );
  const originalPricePerNight = Number(room.price);
  const activeOffer = await prisma.room_offers.findFirst({
    where: {
      room_id: input.room_id,
      is_active: true,
      offer_price: { not: null },
      OR: [
        {
          start_date: { not: null, lte: newCheckIn },
          end_date: { not: null, gte: newCheckOut },
        },
        { start_date: null },
        { end_date: null },
      ],
    },
    orderBy: { created_at: "desc" },
  });
  const pricePerNight =
    activeOffer?.offer_price != null
      ? Number(activeOffer.offer_price)
      : originalPricePerNight;
  const billAmount = pricePerNight * nights;

  const guestEmail =
    input.guest_email?.trim() || `guest-${Date.now()}@booking.local`;

  await prisma.users.update({
    where: { user_id: booking.user_id },
    data: {
      name: input.guest_name.trim(),
      email: guestEmail,
      whatsapp_number:
        String(input.whatsapp_number).replace(/\D/g, "").slice(0, 12) || "0",
    },
  });

  const updatedBooking = await prisma.bookings.update({
    where: { booking_id: input.booking_id },
    data: {
      room_id: input.room_id,
      check_in: newCheckIn,
      check_out: newCheckOut,
      status: "rescheduled",
      adults: input.adults,
      children: input.children ?? 0,
    },
    include: {
      rooms: { select: { room_name: true, room_type: true } },
      users: { select: { name: true, email: true } },
    },
  });

  const firstPayment = await prisma.payments.findFirst({
    where: { booking_id: input.booking_id },
    orderBy: { created_at: "desc" },
    select: { payment_id: true },
  });
  if (firstPayment) {
    await prisma.payments.update({
      where: { payment_id: firstPayment.payment_id },
      data: {
        method: input.payment_method,
        bill_amount: billAmount,
      },
    });
  }

  return updatedBooking;
};

/**
 * Check if a room type has availability for the given date range.
 * Uses total_rooms: count overlapping (non-cancelled) bookings for this room_id
 * between check_in and check_out; if count >= total_rooms, not available.
 * Overlap: existing_check_in < request_check_out AND existing_check_out > request_check_in
 */
export const checkRoomAvailability = async (
  roomId: number,
  checkIn: string,
  checkOut: string,
): Promise<{ available: boolean; message?: string }> => {
  const room = await prisma.rooms.findUnique({
    where: { room_id: roomId },
    select: { room_id: true, total_rooms: true },
  });

  if (!room) {
    return { available: false, message: "Room not found" };
  }

  const reqCheckIn = new Date(checkIn);
  const reqCheckOut = new Date(checkOut);
  if (reqCheckOut <= reqCheckIn) {
    return { available: false, message: "Check-out must be after check-in" };
  }

  const totalRooms = room.total_rooms != null ? Number(room.total_rooms) : 1;

  const overlappingBookings = await prisma.bookings.count({
    where: {
      room_id: roomId,
      status: { not: "cancelled" },
      check_in: { lt: reqCheckOut },
      check_out: { gt: reqCheckIn },
    },
  });

  const available = overlappingBookings < totalRooms;
  return {
    available,
    message: available
      ? undefined
      : "This room has no availability for the selected dates. Please choose different dates or another room.",
  };
};

export type CreateBookingInput = {
  room_id: number;
  check_in: string; // ISO date
  check_out: string; // ISO date
  /** When set, use this existing user instead of creating a new one */
  user_id?: number;
  guest_name: string;
  guest_email?: string;
  whatsapp_number: string;
  adults: number;
  children?: number;
  payment_method: "online" | "partial" | "offline";
};

export const createBooking = async (input: CreateBookingInput) => {
  const room = await prisma.rooms.findUnique({
    where: { room_id: input.room_id },
    select: { price: true, room_name: true },
  });

  if (!room) {
    throw new Error("Room not found");
  }

  const checkIn = new Date(input.check_in);
  const checkOut = new Date(input.check_out);
  if (checkOut <= checkIn) {
    throw new Error("Check-out must be after check-in");
  }

  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
  const originalPricePerNight = Number(room.price);

  const activeOffer = await prisma.room_offers.findFirst({
    where: {
      room_id: input.room_id,
      is_active: true,
      offer_price: { not: null },
      OR: [
        {
          start_date: { not: null, lte: checkIn },
          end_date: { not: null, gte: checkOut },
        },
        { start_date: null },
        { end_date: null },
      ],
    },
    orderBy: { created_at: "desc" },
  });
  const pricePerNight =
    activeOffer?.offer_price != null
      ? Number(activeOffer.offer_price)
      : originalPricePerNight;
  const billAmount = pricePerNight * nights;

  let user: { user_id: number };
  if (input.user_id != null) {
    const existing = await prisma.users.findUnique({
      where: { user_id: input.user_id },
      select: { user_id: true },
    });
    if (!existing) {
      throw new Error("User not found");
    }
    user = existing;
  } else {
    const guestEmail =
      input.guest_email?.trim() || `guest-${Date.now()}@booking.local`;
    user = await prisma.users.create({
      data: {
        name: input.guest_name,
        email: guestEmail,
        whatsapp_number:
          String(input.whatsapp_number).replace(/\D/g, "").slice(0, 12) || "0",
      },
    });
  }

  const booking = await prisma.bookings.create({
    data: {
      user_id: user.user_id,
      room_id: input.room_id,
      check_in: checkIn,
      check_out: checkOut,
      status: "confirmed",
      adults: input.adults,
      children: input.children ?? 0,
    },
    include: {
      rooms: { select: { room_name: true, room_type: true } },
      users: { select: { name: true, email: true } },
    },
  });

  await prisma.payments.create({
    data: {
      user_id: user.user_id,
      booking_id: booking.booking_id,
      method: input.payment_method,
      status: "pending",
      currency: "INR",
      bill_amount: billAmount,
      bill_paid_amount: 0,
    },
  });

  return booking;
};
