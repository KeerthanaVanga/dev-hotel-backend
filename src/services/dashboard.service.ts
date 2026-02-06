import { prisma } from "../db/prisma.js";
import { startOfDay, endOfDay } from "date-fns";

/** Format hour in UTC so we don't double-convert (DB stores UTC; avoid showing IST) */
const formatHour = (d: Date) =>
  d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

export const getDashboardSummary = async () => {
  // Always compute "today" in IST
  const nowIST = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );

  // Midnight IST → 23:59:59 IST
  const fromDate = startOfDay(nowIST);
  const toDate = endOfDay(nowIST);

  // Total users
  const totalUsers = await prisma.users.count();

  // Newly added users (today)
  const newUsersToday = await prisma.users.count({
    where: { created_at: { gte: fromDate, lte: toDate } },
  });

  // Today bookings (created today)
  const todayBookings = await prisma.bookings.count({
    where: { created_at: { gte: fromDate, lte: toDate } },
  });

  // Today check-in (check_in is today)
  const todayCheckIn = await prisma.bookings.count({
    where: {
      check_in: { gte: fromDate, lte: toDate },
      NOT: { status: "cancelled" },
    },
  });

  // Today checkout (check_out is today)
  const todayCheckOut = await prisma.bookings.count({
    where: { check_out: { gte: fromDate, lte: toDate } },
  });

  // Upcoming bookings count (check_in after today)
  const upcomingBookings = await prisma.bookings.count({
    where: {
      check_in: { gt: toDate },
      // optional: ignore cancelled
      NOT: { status: "cancelled" },
    },
  });

  // Today revenue (sum of bill_paid_amount)
  const todayRevenueAgg = await prisma.payments.aggregate({
    _sum: { bill_paid_amount: true },
    where: { updated_at: { gte: fromDate, lte: toDate } },
  });

  const todayRevenue = Number(todayRevenueAgg._sum.bill_paid_amount || 0);

  // Pie chart: today bookings status breakdown (confirmed/rescheduled/cancelled etc.)
  const statusGroups = await prisma.bookings.groupBy({
    by: ["status"],
    _count: { status: true },
    where: { updated_at: { gte: fromDate, lte: toDate } },
  });

  const bookingStatus = statusGroups.map((g) => ({
    status: String(g.status),
    count: g._count.status,
  }));

  // Graph: bookings today by exact time (minute) so e.g. 9:05 AM shows exactly
  const byMinute = await prisma.$queryRaw<{ time: Date; count: number }[]>` 
    SELECT date_trunc('minute', created_at) as time,
           COUNT(*)::int as count
    FROM bookings
    WHERE created_at BETWEEN ${fromDate} AND ${toDate}
    GROUP BY date_trunc('minute', created_at)
    ORDER BY date_trunc('minute', created_at)
  `;
  const hourlyBookings = byMinute.map((row) => ({
    hour: formatHour(row.time),
    count: Number(row.count),
  }));

  return {
    kpis: {
      totalUsers,
      newUsersToday,
      todayBookings,
      todayCheckIn,
      todayCheckOut,
      upcomingBookings,
      todayRevenue,
    },
    charts: {
      bookingStatus,
      hourlyBookings,
    },
  };
};
