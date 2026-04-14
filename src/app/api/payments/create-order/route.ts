import { NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const { amount, entityType, entityId, currency = "INR" } = await req.json();
    if (!amount || !entityType || !entityId) return fail("amount, entityType, entityId required", 400);

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      // Dev mode: return a mock order
      return ok({
        orderId: `order_dev_${Date.now()}`,
        amount: amount * 100,
        currency,
        keyId: "rzp_test_placeholder",
        devMode: true,
      });
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({ amount: amount * 100, currency, receipt: `${entityType}_${entityId}` }),
    });

    if (!res.ok) return fail("Payment gateway error", 502);
    const order = await res.json() as { id: string };
    return ok({ orderId: order.id, amount: amount * 100, currency, keyId });
  } catch (e) { return handleErr(e); }
}
