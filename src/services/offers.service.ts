// server/services/offers.service.ts
import { prisma } from "../db/prisma";

/** Get all offers */
export const getAllOffers = async () => {
  return prisma.room_offers.findMany({
    orderBy: { created_at: "desc" },
    include: {
      rooms: {
        select: {
          room_id: true,
          room_name: true,
          room_type: true,
          price: true,
        },
      },
    },
  });
};

/** Get single offer */
export const getOfferById = async (offerId: number) => {
  return prisma.room_offers.findUnique({
    where: { offer_id: offerId },
    include: {
      rooms: {
        select: {
          room_id: true,
          room_name: true,
          room_type: true,
          price: true,
        },
      },
    },
  });
};

/** Create offer (room_name → room_id mapping happens in controller) */
export const createOffer = async (data: {
  title: string;
  room_id: number;
  discount_percent: number;
  offer_price?: number | string | null;
  start_date?: Date | null;
  end_date?: Date | null;
  is_active?: boolean;
}) => {
  const payload: Parameters<typeof prisma.room_offers.create>[0]["data"] = {
    title: data.title,
    room_id: data.room_id,
    discount_percent: data.discount_percent,
    start_date: data.start_date ?? undefined,
    end_date: data.end_date ?? undefined,
    is_active: data.is_active ?? undefined,
  };
  if (data.offer_price != null && data.offer_price !== "") {
    payload.offer_price = Number(data.offer_price);
  }
  return prisma.room_offers.create({
    data: payload,
  });
};

/** Update offer */
export const updateOffer = async (
  offerId: number,
  data: Partial<{
    room_id: number;
    discount_percent: number;
    offer_price: number | string | null;
    start_date: Date | null;
    end_date: Date | null;
    is_active: boolean;
    title: string;
  }>,
) => {
  const payload: Record<string, unknown> = {};
  if (data.room_id !== undefined) payload.room_id = data.room_id;
  if (data.discount_percent !== undefined)
    payload.discount_percent = data.discount_percent;
  if (data.start_date !== undefined) payload.start_date = data.start_date;
  if (data.end_date !== undefined) payload.end_date = data.end_date;
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.title !== undefined) payload.title = data.title;
  if (data.offer_price !== undefined) {
    payload.offer_price =
      data.offer_price == null || data.offer_price === ""
        ? null
        : Number(data.offer_price);
  }
  return prisma.room_offers.update({
    where: { offer_id: offerId },
    data: payload as Parameters<typeof prisma.room_offers.update>[0]["data"],
  });
};

/** Delete offer */
export const deleteOffer = async (offerId: number) => {
  return prisma.room_offers.delete({
    where: { offer_id: offerId },
  });
};
