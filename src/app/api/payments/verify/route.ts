import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, fail, handleErr } from "@/lib/api";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, entityType, entityId, userId, amount } = body;

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (secret) {
      const expectedSig = crypto.createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (expectedSig !== razorpay_signature) return fail("Invalid payment signature", 400);
    }

    await prisma.payment.create({
      data: {
        userId, entityType, entityId,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        amount: amount ?? 0,
        currency: "INR",
        status: "paid",
        paidAt: new Date(),
      },
    });

    return ok({ verified: true });
  } catch (e) { return handleErr(e); }
}
