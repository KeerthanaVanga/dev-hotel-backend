import { prisma } from "../db/prisma";

export const createRoom = async (data: any) => {
  return prisma.rooms.create({
    data,
  });
};

export const updateRoomById = async (roomId: string, data: any) => {
  return prisma.rooms.update({
    where: { room_id: Number(roomId) },
    data,
  });
};

export const getAllRooms = async () => {
  return prisma.rooms.findMany({
    orderBy: { created_at: "desc" },
  });
};
