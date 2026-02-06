import { prisma } from "../db/prisma";
import { startOfDay, endOfDay } from "date-fns";

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const getReportsSummary = async (from?: string, to?: string) => {
  const fromDate = from ? new Date(from) : startOfDay(new Date());
  const toDate = to ? new Date(to) : endOfDay(new Date());

  /* ---------------- Revenue ---------------- */
  const payments = await prisma.payments.findMany({});

  const totalRevenue = payments.reduce(
    (sum, p) => sum + Number(p.bill_paid_amount),
    0,
  );

  /* ---------------- Revenue Today ---------------- */
  const todayPayments = await prisma.payments.aggregate({
    _sum: {
      bill_paid_amount: true,
    },
    where: {
      created_at: {
        gte: startOfDay(new Date()),
        lte: endOfDay(new Date()),
      },
    },
  });

  /* ---------------- Bookings ---------------- */
  const totalBookings = await prisma.bookings.count({
    where: {
      created_at: {
        gte: fromDate,
        lte: toDate,
      },
    },
  });

  /* ---------------- Rooms / Occupancy ---------------- */
  const rooms = await prisma.rooms.findMany();

  const totalRooms = rooms.reduce((sum, r) => sum + (r.total_rooms ?? 0), 0);

  const bookedRooms = rooms.reduce((sum, r) => sum + (r.booked_rooms ?? 0), 0);

  const occupancy =
    totalRooms === 0 ? 0 : Math.round((bookedRooms / totalRooms) * 100);

  /* ---------------- ADR & RevPAR ---------------- */
  const adr =
    totalBookings === 0 ? 0 : Math.round(totalRevenue / totalBookings);

  const revpar = totalRooms === 0 ? 0 : Math.round(totalRevenue / totalRooms);

  /* ---------------- Revenue Trend ---------------- */
  const revenueTrend = await prisma.$queryRaw<
    { date: Date; revenue: number }[]
  >`
    SELECT DATE(created_at) as date,
           SUM(bill_paid_amount)::float as revenue
    FROM payments
    WHERE created_at BETWEEN ${fromDate} AND ${toDate}
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  `;

  /* ---------------- Revenue by Room Type ---------------- */
  const revenueByRoom = await prisma.$queryRaw<
    { room_name: string; revenue: number }[]
  >`
    SELECT r.room_name,
           SUM(p.bill_paid_amount)::float as revenue
    FROM payments p
    JOIN bookings b ON b.booking_id = p.booking_id
    JOIN rooms r ON r.room_id = b.room_id
    WHERE p.created_at BETWEEN ${fromDate} AND ${toDate}
    GROUP BY r.room_name
  `;

  /* ---------------- Payment Status (COUNT + AMOUNTS) ---------------- */

  type PaymentBucket = {
    status: string;
    count: number;
    totalBillAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };

  const paymentStatusMap: Record<string, PaymentBucket> = {};

  for (const p of payments) {
    const status = p.status.toLowerCase();

    if (!paymentStatusMap[status]) {
      paymentStatusMap[status] = {
        status,
        count: 0,
        totalBillAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
      };
    }

    const billAmount = Number(p.bill_amount || 0);
    const paidAmount = Number(p.bill_paid_amount || 0);

    paymentStatusMap[status].count += 1;
    paymentStatusMap[status].totalBillAmount += billAmount;
    paymentStatusMap[status].paidAmount += paidAmount;
  }

  /* calculate pending per status */
  for (const key in paymentStatusMap) {
    const bucket = paymentStatusMap[key];
    bucket.pendingAmount = bucket.totalBillAmount - bucket.paidAmount;
  }

  const paymentStatus = Object.values(paymentStatusMap);

  return {
    kpis: {
      totalRevenue,
      revenueToday: Number(todayPayments._sum.bill_paid_amount || 0),
      totalBookings,
      occupancy,
      adr,
      revpar,
    },

    charts: {
      revenueTrend: revenueTrend.map((r) => ({
        date: formatDate(r.date),
        revenue: r.revenue,
      })),
      revenueByRoom: revenueByRoom,
      paymentStatus: paymentStatus,
    },
  };
};
