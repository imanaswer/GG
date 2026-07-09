import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionFromRequest } from "@/lib/adminAuth";
import { sniffImage } from "@/lib/imageSniff";
import crypto from "crypto";

export const runtime = "nodejs";

const ALLOWED = new Set(["jpeg", "png", "webp", "avif", "gif"]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

// Build a Cloudinary signature for a fresh upload target. Signs exactly the params
// the client sends back (folder, public_id, timestamp); Cloudinary recomputes the
// same sha1 over them + the secret. Shared by GET (browser direct upload) and POST.
function signUpload(secret: string) {
  const folder = "gameground/admin";
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = `admin_${timestamp}_${crypto.randomBytes(4).toString("hex")}`;
  const paramsToSign: Record<string, string> = { folder, public_id: publicId, timestamp: String(timestamp) };
  const signature = crypto
    .createHash("sha1")
    .update(Object.keys(paramsToSign).sort().map((k) => `${k}=${paramsToSign[k]}`).join("&") + secret)
    .digest("hex");
  return { folder, timestamp, publicId, signature };
}

// Hands the browser a short-lived signature so it can upload the file DIRECTLY to
// Cloudinary, bypassing this app server entirely. That avoids the platform/proxy
// request-body limits (Vercel 4.5 MB, nginx default 1 MB) that otherwise reject a
// large multipart POST with a plain-text 413 — which is what produced the client's
// "Unexpected token 'R', \"Request En\"... is not valid JSON" error.
export async function GET(req: NextRequest) {
  try {
    if (!(await getAdminSessionFromRequest(req)))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cloud  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !secret)
      return NextResponse.json({ error: "Image uploads are not configured" }, { status: 503 });

    const { folder, timestamp, publicId, signature } = signUpload(secret);
    return NextResponse.json({ cloudName: cloud, apiKey, timestamp, signature, folder, publicId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not sign upload" }, { status: 500 });
  }
}

// Uploads go to Cloudinary, NOT the local filesystem — Vercel's runtime FS is
// read-only, so writing to public/uploads throws (500) in production. Uses a
// signed direct upload (no SDK needed). Always returns JSON so the client never
// hits "Unexpected end of JSON input".
export async function POST(req: NextRequest) {
  try {
    if (!(await getAdminSessionFromRequest(req)))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cloud  = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !secret)
      return NextResponse.json({ error: "Image uploads are not configured" }, { status: 503 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "File size must be under 5 MB" }, { status: 400 });

    // Validate by magic bytes, not the client-declared MIME type.
    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniffImage(buf);
    if (!kind || !ALLOWED.has(kind))
      return NextResponse.json({ error: "File is not a valid image" }, { status: 415 });

    const { folder, timestamp, publicId, signature } = signUpload(secret);

    const upstream = new FormData();
    upstream.set("file", new Blob([buf]), file.name || "upload");
    upstream.set("api_key", apiKey);
    upstream.set("timestamp", String(timestamp));
    upstream.set("signature", signature);
    upstream.set("folder", folder);
    upstream.set("public_id", publicId);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: upstream,
    });
    const json = (await res.json()) as { secure_url?: string; error?: { message: string } };
    if (!res.ok || !json.secure_url) {
      return NextResponse.json({ error: json.error?.message ?? "Upload failed" }, { status: 502 });
    }

    return NextResponse.json({ url: json.secure_url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 500 });
  }
}
