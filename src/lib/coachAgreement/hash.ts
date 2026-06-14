import crypto from "crypto";
export type HashInput = { content: string; version: string; signatureName: string; acceptedAtISO: string };
/** SHA-256 over the exact accepted content + version + signature + timestamp.
 *  Reproducible later for tamper detection. NEVER regenerate after signing. */
export function computeAgreementHash(input: HashInput): string {
  const canonical = [input.content, input.version, input.signatureName, input.acceptedAtISO].join("\n--\n");
  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}
