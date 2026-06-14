export function formatAgreementNumber(year: number, seq: number): string {
  return `AGR-${year}-${String(seq).padStart(6, "0")}`;
}
