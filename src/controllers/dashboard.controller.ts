import { Request, Response } from "express";
import { getDashboardSummary } from "../services/dashboard.service.js";

// BigInt-safe serializer
const serializeBigInt = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );

export const fetchDashboardSummary = async (req: Request, res: Response) => {
  try {
    const data = await getDashboardSummary();
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (error) {
    console.error("DASHBOARD SUMMARY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
    });
  }
};
