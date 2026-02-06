import { Request, Response } from "express";
import {
  getAllUsersPayments,
  getPaymentById,
  updatePayment,
} from "../services/payment.service.js";

// BigInt-safe serializer
const serializeBigInt = (data: any) =>
  JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );

const PAYMENT_METHODS = ["partial_online", "full_online", "offline"] as const;
const PAYMENT_STATUSES = ["partial_paid", "paid", "pending"] as const;

export const fetchAllUsersPayments = async (req: Request, res: Response) => {
  try {
    const payments = await getAllUsersPayments();

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: serializeBigInt(payments),
    });
  } catch (error) {
    console.error("FETCH PAYMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
    });
  }
};

export const updatePaymentHandler = async (req: Request, res: Response) => {
  try {
    const paymentId = BigInt(req.params.id);
    const { method, status, bill_paid_amount } = req.body;

    const data: Parameters<typeof updatePayment>[1] = {};
    if (method !== undefined) {
      if (!PAYMENT_METHODS.includes(method)) {
        return res.status(400).json({
          success: false,
          message:
            "method must be one of: partial_online, full_online, offline",
        });
      }
      data.method = method;
    }
    if (status !== undefined) {
      if (!PAYMENT_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "status must be one of: partial_paid, paid, pending",
        });
      }
      data.status = status;
    }
    if (bill_paid_amount !== undefined) {
      const amountToAdd = Number(bill_paid_amount);
      if (Number.isNaN(amountToAdd) || amountToAdd < 0) {
        return res.status(400).json({
          success: false,
          message: "bill_paid_amount must be a non-negative number",
        });
      }
      const existing = await getPaymentById(paymentId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }
      const currentPaid = Number(existing.bill_paid_amount ?? 0);
      const totalAmount = Number(existing.bill_amount ?? 0);
      const newPaidAmount = currentPaid + amountToAdd;
      if (newPaidAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Paid amount cannot be greater than total amount",
        });
      }
      data.bill_paid_amount = newPaidAmount;
    }

    const updated = await updatePayment(paymentId, data);
    return res.status(200).json({
      success: true,
      data: serializeBigInt(updated),
      message: "Payment updated successfully",
    });
  } catch (error) {
    console.error("UPDATE PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment",
    });
  }
};
