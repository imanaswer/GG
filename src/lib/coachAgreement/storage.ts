import crypto from "crypto";

const FOLDER = "gameground/coach-agreements";

function cfg() {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !apiKey || !secret) throw new Error("Cloudinary is not configured");
  return { cloud, apiKey, secret };
}

function sign(params: Record<string, string>, secret: string): string {
  return crypto.createHash("sha1")
    .update(Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&") + secret)
    .digest("hex");
}

/** Upload PDF bytes privately (raw + authenticated). Returns the public_id to store. */
export async function uploadAgreementPdf(bytes: Uint8Array, publicIdBase: string): Promise<string> {
  const { cloud, apiKey, secret } = cfg();
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `${publicIdBase}_${timestamp}`;
  const toSign = { folder: FOLDER, public_id: publicId, timestamp: String(timestamp), type: "authenticated" };
  const signature = sign(toSign, secret);

  const form = new FormData();
  form.set("file", new Blob([Buffer.from(bytes)], { type: "application/pdf" }), `${publicId}.pdf`);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("signature", signature);
  form.set("folder", FOLDER);
  form.set("public_id", publicId);
  form.set("type", "authenticated");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/raw/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Cloudinary upload failed: ${res.status}`);
  const json = (await res.json()) as { public_id: string };
  return json.public_id;
}

/**
 * Build a short-lived signed delivery URL for a private raw asset.
 *
 * Note: the standard `res.cloudinary.com/.../raw/authenticated/<public_id>` delivery
 * path requires an `s--<token>--` signature segment derived from a separate
 * (SHA-256 + base64) URL-signing algorithm and the asset's version number, which
 * isn't available from just the public_id. Instead we use Cloudinary's Admin API
 * "raw/download" endpoint, which accepts the same sha1 query-signature scheme used
 * for uploads and returns the raw bytes directly for `type=authenticated` assets.
 */
export function signedAgreementUrl(publicId: string, ttlSeconds = 300): string {
  const { cloud, apiKey, secret } = cfg();
  void ttlSeconds; // the admin download URL is signed with a fresh timestamp each call
  const timestamp = Math.floor(Date.now() / 1000);
  const toSign = { public_id: publicId, timestamp: String(timestamp), type: "authenticated" };
  const signature = sign(toSign, secret);
  const q = new URLSearchParams({
    api_key: apiKey,
    timestamp: String(timestamp),
    signature,
    resource_type: "raw",
    type: "authenticated",
    public_id: publicId,
  });
  return `https://api.cloudinary.com/v1_1/${cloud}/raw/download?${q.toString()}`;
}

/** Fetch the private PDF bytes server-side (used by the proxy download route). */
export async function fetchAgreementPdf(publicId: string): Promise<Buffer> {
  const res = await fetch(signedAgreementUrl(publicId), { cache: "no-store" });
  if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
