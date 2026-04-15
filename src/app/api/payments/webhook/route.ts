import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

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
        // Mark existing Payment row as paid, or create a stub if the client never
        // reached /verify (user closed tab). Registration rows still require the
        // client-verify path because they carry user-submitted fields (childName, etc.).
        const existing = await prisma.payment.findFirst({ where: { razorpayOrderId } });
        if (existing) {
          if (existing.status !== "paid") {
            await prisma.payment.update({
              where: { id: existing.id },
              data: { status: "paid", paidAt: new Date(), razorpayPaymentId },
            });
            await syncRegistrationStatus(existing.entityType, existing.entityId, existing.userId, "paid");
          }
        }
        // If the Payment row doesn't exist yet, the client verify endpoint will create it
        // with status: "paid" directly. We don't create an orphan stub because we lack
        // userId/entityType/entityId from the webhook alone.
        return NextResponse.json({ ok: true, event: body.event });
      }

      case "payment.failed": {
        const existing = await prisma.payment.findFirst({ where: { razorpayOrderId } });
        if (existing && existing.status !== "paid") {
          await prisma.payment.update({
            where: { id: existing.id },
            data: { status: "failed", razorpayPaymentId },
          });
          await syncRegistrationStatus(existing.entityType, existing.entityId, existing.userId, "failed");
        }
        return NextResponse.json({ ok: true, event: body.event });
      }

      default:
        return NextResponse.json({ ok: true, ignored: body.event });
    }
  } catch (e) {
    console.error("[razorpay webhook]", e);
    // Razorpay retries non-2xx, so return 500 on transient DB failure to get a retry.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

async function syncRegistrationStatus(
  entityType: string,
  entityId: string,
  userId: string,
  status: "paid" | "failed",
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
