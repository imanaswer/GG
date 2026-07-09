import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { PaymentStatus } from "@/lib/paymentStatus";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Razorpay posts JSON. We must read the raw body to verify the signature byte-for-byte
// before parsing — JSON.parse-and-restringify would not round-trip reliably.
export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");

  // timingSafeEqual needs equal-length buffers.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  type Event = {
    event: string;
    payload: {
      payment?: {
        entity?: {
          id: string;
          order_id: string;
          amount: number;
          currency: string;
          status: string;
          error_description?: string;
        };
      };
    };
  };

  let body: Event;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const entity = body.payload?.payment?.entity;
  if (!entity) return NextResponse.json({ ok: true, ignored: "no payment entity" });

  const razorpayOrderId   = entity.order_id;
  const razorpayPaymentId = entity.id;

  try {
    switch (body.event) {
      case "payment.captured": {
        // Durably record the capture on the order ledger first (idempotent — first
        // capture wins via capturedAt:null). This makes a payment that is captured but
        // never reaches the client /verify path (user closed the tab) recoverable
        // instead of silently lost — see the reconciliation query in RUNBOOK.md.
        // We record on PaymentOrder, NOT as a Payment row: creating a Payment here would
        // trip verify's razorpayPaymentId replay guard and permanently block the client
        // from creating the registration (which carries user-submitted fields).
        await prisma.paymentOrder.updateMany({
          where: { razorpayOrderId, capturedAt: null },
          data: { capturedAt: new Date(), razorpayPaymentId },
        });

        const existing = await prisma.payment.findFirst({ where: { razorpayOrderId } });
        if (existing) {
          if (existing.status !== "paid") {
            await prisma.payment.update({
              where: { id: existing.id },
              data: { status: "paid" satisfies PaymentStatus, paidAt: new Date(), razorpayPaymentId },
            });
            // refund events are handled by admin "Mark refunded" action, not the webhook
            await syncRegistrationStatus(existing.entityType, existing.entityId, existing.userId, "paid" satisfies PaymentStatus);
          }
        } else {
          // No Payment row yet: the client /verify hasn't run or was abandoned. The
          // capturedAt marker above lets reconciliation catch it if verify never
          // completes; log for visibility (surfaces in error monitoring once wired).
          logger.warn("razorpay capture with no Payment row — client verify pending or abandoned", { razorpayOrderId, razorpayPaymentId });
        }
        return NextResponse.json({ ok: true, event: body.event });
      }

      case "payment.failed": {
        const existing = await prisma.payment.findFirst({ where: { razorpayOrderId } });
        if (existing && existing.status !== "paid") {
          await prisma.payment.update({
            where: { id: existing.id },
            data: { status: "failed" satisfies PaymentStatus, razorpayPaymentId },
          });
          await syncRegistrationStatus(existing.entityType, existing.entityId, existing.userId, "failed" satisfies PaymentStatus);
        }
        return NextResponse.json({ ok: true, event: body.event });
      }

      default:
        return NextResponse.json({ ok: true, ignored: body.event });
    }
  } catch (e) {
    logger.error("razorpay webhook processing failed", { event: body?.event, err: e });
    // Razorpay retries non-2xx, so return 500 on transient DB failure to get a retry.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function syncRegistrationStatus(
  entityType: string,
  entityId: string,
  userId: string,
  status: Extract<PaymentStatus, "paid" | "failed">,
): Promise<void> {
  if (entityType === "camp") {
    await prisma.campRegistration.updateMany({
      where: { campId: entityId, userId }, data: { paymentStatus: status },
    });
  } else if (entityType === "event") {
    await prisma.eventRegistration.updateMany({
      where: { eventId: entityId, userId }, data: { paymentStatus: status },
    });
  }
  // game: GamePlayer has no paymentStatus column; Payment row is source of truth.
}
