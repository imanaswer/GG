import { csvSafe } from "@/lib/coachPublic";

// Names, notes and titles are user text and land in Excel: a leading = + - @
// would run as a formula on the admin's machine.
function cell(v: string | null | undefined): string {
  const s = csvSafe(v == null ? "" : String(v));
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | null | undefined)[][]): string {
  const lines = [headers.map(cell).join(",")];
  for (const r of rows) lines.push(r.map(cell).join(","));
  return lines.join("\r\n");
}
