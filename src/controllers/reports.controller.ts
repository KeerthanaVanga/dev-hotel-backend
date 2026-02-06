import { Request, Response } from "express";
import { getReportsSummary } from "../services/reports.service.js";

export const getReports = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const data = await getReportsSummary(from as string, to as string);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("REPORTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
    });
  }
};
