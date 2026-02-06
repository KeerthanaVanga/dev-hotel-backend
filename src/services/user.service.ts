import { prisma } from "../db/prisma.js";

export const getAllUsers = async () => {
  return await prisma.users.findMany({
    select: {
      user_id: true,
      name: true,
      email: true,
      whatsapp_number: true,
      created_at: true,
      updated_at: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
};

export const createUser = async (data: {
  name: string;
  email: string;
  whatsapp: string;
}) => {
  return prisma.users.create({
    data: {
      name: data.name,
      email: data.email,
      whatsapp_number: data.whatsapp,
    },
  });
};

export const updateUser = async (
  userId: number,
  data: {
    name: string;
    email: string;
    whatsapp: string;
  },
) => {
  return prisma.users.update({
    where: { user_id: userId },
    data: {
      name: data.name,
      email: data.email,
      whatsapp_number: data.whatsapp,
    },
  });
};
