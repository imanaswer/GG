import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSessionFromRequest } from "@/lib/auth";
import { ok, fail, handleErr } from "@/lib/api";

// 5 MB ceiling. Rejects anything larger before we buffer it for Cloudinary.
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) return fail("Authentication required", 401);

    const cloud   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey  = process.env.CLOUDINARY_API_KEY;
    const secret  = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !secret) return fail("Image uploads are not configured", 503);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("No file provided", 400);
    if (file.size === 0) return fail("Empty file", 400);
    if (file.size > MAX_BYTES) return fail(`File exceeds ${MAX_BYTES / 1024 / 1024}MB limit`, 413);
    if (!ALLOWED.has(file.type)) return fail(`Unsupported type: ${file.type || "unknown"}`, 415);

    const folderRaw = form.get("folder");
    const folder = typeof folderRaw === "string" && /^[a-z0-9_\-/]{1,48}$/i.test(folderRaw)
      ? folderRaw : "gameground/uploads";

    const timestamp = Math.floor(Date.now() / 1000);
    const publicId  = `${session.id}_${timestamp}_${crypto.randomBytes(4).toString("hex")}`;

    // Cloudinary signature: sha1 of sorted "k=v" params (minus file, cloud_name, api_key, resource_type)
    // concatenated with the API secret.
    const paramsToSign: Record<string, string> = {
      folder,
      public_id: publicId,
      timestamp: String(timestamp),
    };
    const signature = crypto
      .createHash("sha1")
      .update(
        Object.keys(paramsToSign).sort().map((k) => `${k}=${paramsToSign[k]}`).join("&") + secret,
      )
      .digest("hex");

    const upstream = new FormData();
    upstream.set("file", file, file.name || "upload");
    upstream.set("api_key", apiKey);
    upstream.set("timestamp", String(timestamp));
    upstream.set("signature", signature);
    upstream.set("folder", folder);
    upstream.set("public_id", publicId);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: "POST",
      body: upstream,
    });
    const json = await res.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; format?: string; error?: { message: string } };
    if (!res.ok || !json.secure_url) {
      return fail(json.error?.message ?? "Upload failed", 502);
    }

    return ok({
      url: json.secure_url,
      publicId: json.public_id,
      width: json.width,
      height: json.height,
      format: json.format,
    }, 201);
  } catch (e) { return handleErr(e); }
}
