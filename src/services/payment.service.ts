import { prisma } from "../db/prisma.js";

export const getPaymentById = async (paymentId: bigint) => {
  return prisma.payments.findUnique({
    where: { payment_id: paymentId },
    select: { payment_id: true, bill_amount: true, bill_paid_amount: true },
  });
};

export const getAllUsersPayments = async () => {
  return prisma.payments.findMany({
    orderBy: {
      created_at: "desc",
    },
    include: {
      users: {
        select: {
          user_id: true,
          name: true,
          email: true,
        },
      },
      bookings: {
        select: {
          booking_id: true,
          check_in: true,
          check_out: true,
          status: true,
        },
      },
    },
  });
};

export type UpdatePaymentInput = {
  method?: "partial_online" | "full_online" | "offline";
  status?: "partial_paid" | "paid" | "pending";
  bill_paid_amount?: number;
};

export const updatePayment = async (
  paymentId: bigint,
  data: UpdatePaymentInput,
) => {
  const payload: {
    method?: string;
    status?: string;
    bill_paid_amount?: number;
  } = {};
  if (data.method !== undefined) payload.method = data.method;
  if (data.status !== undefined) payload.status = data.status;
  if (data.bill_paid_amount !== undefined)
    payload.bill_paid_amount = data.bill_paid_amount;

  return prisma.payments.update({
    where: { payment_id: paymentId },
    data: payload,
    include: {
      users: { select: { user_id: true, name: true, email: true } },
      bookings: {
        select: {
          booking_id: true,
          check_in: true,
          check_out: true,
          status: true,
        },
      },
    },
  });
};
