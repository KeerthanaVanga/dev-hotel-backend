import { prisma } from "../db/prisma.js";

export const getAllReviews = async () => {
  return prisma.reviews.findMany({
    orderBy: {
      created_at: "desc",
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
  });
};
