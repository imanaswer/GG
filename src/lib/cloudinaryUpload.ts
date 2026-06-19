// Browser-side signed direct upload to Cloudinary.
//
// The file is sent straight from the browser to Cloudinary, NOT through our app
// server. This is the fix for the "Unexpected token 'R', \"Request En\"..." error:
// that was a plain-text "Request Entity Too Large" (413) returned by the platform
// proxy (Vercel's 4.5 MB function-payload cap, or an nginx default 1 MB body limit)
// BEFORE the request ever reached our always-JSON /api/admin/upload route, so the
// client's res.json() choked on HTML/text. Uploading direct to Cloudinary sidesteps
// every app-server body limit. Our server only hands out a short-lived signature.

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const ALLOWED_LABEL = "JPEG, PNG, WebP, AVIF or GIF";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB — matches the server-side guard.

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

type SignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  publicId: string;
  error?: string;
};

// Read a response as text first, then try to parse JSON. A non-JSON body (e.g. a
// proxy's plain-text 413/502 error page) yields a readable message instead of a
// cryptic "Unexpected token" SyntaxError.
async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text.trim().slice(0, 140) || `Request failed (${res.status})`);
  }
}

export async function uploadToCloudinary(file: File): Promise<string> {
  // Specific, actionable validation messages — tell the user what's wrong AND the fix.
  if (!ALLOWED.includes(file.type)) {
    const kind = file.type ? file.type.replace(/^image\//, "").toUpperCase() : "This file type";
    throw new Error(`${kind} isn't supported. Use a ${ALLOWED_LABEL} image (max 5 MB).`);
  }
  if (file.size === 0) throw new Error("That file is empty (0 KB) — pick another image.");
  if (file.size > MAX_SIZE)
    throw new Error(
      `Image is ${mb(file.size)} MB — the limit is 5 MB. Compress it (e.g. tinypng.com or "Save for web") or pick a smaller file.`,
    );

  // 1. Ask our (admin-auth gated) server for a signature. Tiny request, no file.
  let signRes: Response;
  try {
    signRes = await fetch("/api/admin/upload");
  } catch {
    throw new Error("Network error reaching the server. Check your connection and try again.");
  }
  if (signRes.status === 401)
    throw new Error("Your admin session expired. Refresh the page, sign in again, then retry.");
  const sign = await parseJson<SignResponse>(signRes);
  if (!signRes.ok)
    throw new Error(sign.error || "Image uploads aren't set up on the server (missing Cloudinary keys).");

  // 2. POST the file directly to Cloudinary with the signed params. Only folder,
  //    public_id and timestamp are signed, so no extra signable params here.
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sign.apiKey);
  fd.append("timestamp", String(sign.timestamp));
  fd.append("signature", sign.signature);
  fd.append("folder", sign.folder);
  fd.append("public_id", sign.publicId);

  let upRes: Response;
  try {
    upRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
      method: "POST",
      body: fd,
    });
  } catch {
    throw new Error("Couldn't reach the image host. Check your connection and try again.");
  }
  const up = await parseJson<{ secure_url?: string; error?: { message: string } }>(upRes);
  if (!upRes.ok || !up.secure_url)
    throw new Error(up.error?.message || `Image host rejected the upload (${upRes.status}). Try again.`);
  return up.secure_url;
}
