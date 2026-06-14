import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { getAgreement } from "./content";

export type PdfData = {
  agreementNumber: string;
  version: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  signatureName: string;
  acceptedAtISO: string;
  ipAddress: string;
  userAgent: string;
  agreementHash: string;
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const RED = rgb(0.902, 0.224, 0.275);

// pdf-lib's StandardFonts (Helvetica/HelveticaBold) use WinAnsi encoding, which
// safely covers printable ASCII (0x20-0x7E) and the Latin-1 Supplement
// letters/punctuation block (0xA0-0xFF, e.g. e-acute, n-tilde, middle dot).
// Coach-entered data (address, user agent, names, etc.) can contain emoji,
// CJK, or undefined C1 control characters (0x7F-0x9F) that WinAnsi can't
// encode — `page.drawText` throws on those. Replace anything outside the two
// safe ranges with "?" so PDF generation never crashes on real-world input.
function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateAgreementPdf(data: PdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const agreement = getAgreement(data.version);
  const contentWidth = A4[0] - MARGIN * 2;

  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - MARGIN;

  const ensure = (need: number) => { if (y - need < MARGIN) { page = doc.addPage(A4); y = A4[1] - MARGIN; } };
  const draw = (text: string, f: PDFFont, size: number, color = rgb(0.1, 0.1, 0.1)) => {
    for (const ln of wrap(sanitize(text), f, size, contentWidth)) {
      ensure(size + 4);
      page.drawText(ln, { x: MARGIN, y, size, font: f, color });
      y -= size + 4;
    }
  };
  const gap = (h: number) => { y -= h; };

  page.drawRectangle({ x: 0, y: A4[1] - 40, width: A4[0], height: 40, color: RED });
  page.drawText("GAME GROUND", { x: MARGIN, y: A4[1] - 27, size: 14, font: bold, color: rgb(1, 1, 1) });
  y = A4[1] - 64;

  draw("Coach Partnership Agreement", bold, 18);
  gap(4);
  draw(`Agreement Number: ${data.agreementNumber}   ·   Version: ${data.version}`, font, 10);
  draw(`Effective: ${agreement.effectiveDate}   ·   Governing law: ${agreement.jurisdiction}`, font, 10);
  gap(10);

  draw("Coach Details", bold, 12);
  gap(2);
  const details: [string, string][] = [
    ["Full legal name", data.fullName],
    ["Email", data.email],
    ["Phone", data.phone],
    ["Date of birth", data.dateOfBirth],
    ["Address", data.address],
    ["Emergency contact", `${data.emergencyContactName} (${data.emergencyContactNumber})`],
  ];
  for (const [k, v] of details) draw(`${k}: ${v}`, font, 10);
  gap(10);

  for (const s of agreement.sections) { gap(4); draw(s.heading, bold, 12); draw(s.body, font, 10); }
  gap(12);

  draw("Electronic Signature", bold, 12);
  draw(`Signed by (typed signature): ${data.signatureName}`, font, 10);
  draw(`Accepted at: ${data.acceptedAtISO}`, font, 10);
  draw(`IP address: ${data.ipAddress}`, font, 10);
  draw(`User agent: ${data.userAgent}`, font, 9);
  gap(6);
  draw(`Integrity hash (SHA-256): ${data.agreementHash}`, font, 8, rgb(0.4, 0.4, 0.4));

  return doc.save();
}
