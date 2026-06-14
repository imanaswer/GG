// IMMUTABILITY RULE: once v1.0 has been signed by anyone, NEVER edit the v1.0
// entry below. Ship changes as a new version (v1.1, ...). The hash + "always
// show the accepted version" guarantees depend on this text being frozen.

export type AgreementSection = { heading: string; body: string };
export type Agreement = {
  version: string;
  effectiveDate: string;
  jurisdiction: string;
  sections: AgreementSection[];
};

export const CURRENT_AGREEMENT_VERSION = "v1.0";

const V1_0: Agreement = {
  version: "v1.0",
  effectiveDate: "2026-06-15",
  jurisdiction: "Kozhikode, Kerala, India",
  sections: [
    { heading: "1. Professional Conduct", body:
      "The Coach shall at all times conduct themselves with integrity, courtesy, and professionalism toward players, parents, GameGround staff, and the public. The Coach shall not engage in harassment, discrimination, abusive language, intoxication during sessions, or any conduct that brings GameGround into disrepute." },
    { heading: "2. Coaching Responsibilities", body:
      "The Coach shall deliver coaching services with reasonable skill and care, arrive punctually and prepared, provide age- and skill-appropriate instruction, maintain accurate attendance, and communicate promptly with players regarding scheduling, cancellations, and progress." },
    { heading: "3. Certifications & Qualifications", body:
      "The Coach represents that all certifications, qualifications, and experience provided to GameGround are true and current. The Coach shall maintain the qualifications required for their sport and promptly notify GameGround of any lapse, suspension, or revocation." },
    { heading: "4. Payments & Earnings", body:
      "GameGround shall remit the Coach's earnings, net of the agreed platform service fee and applicable taxes, according to the published payout schedule. The Coach is responsible for their own income-tax obligations. Earnings are calculated from confirmed, completed sessions recorded on the platform." },
    { heading: "5. Cancellations & Refunds", body:
      "The Coach shall honour the cancellation and refund policy published by GameGround. Sessions cancelled by the Coach without adequate notice may be refunded to the player in full, and repeated late cancellations may affect the Coach's standing on the platform." },
    { heading: "6. Safety & Liability", body:
      "The Coach is responsible for maintaining a safe coaching environment, holding any insurance required by law, and reporting injuries or incidents to GameGround without delay. The Coach indemnifies GameGround against claims arising from the Coach's negligence or wilful misconduct, to the extent permitted by law." },
    { heading: "7. Background Verification", body:
      "The Coach consents to identity and background verification, including checks relevant to working with minors where applicable. The Coach shall provide accurate information for these checks and authorises GameGround to conduct them through third-party providers." },
    { heading: "8. Intellectual Property", body:
      "Training materials, drills, and content created by the Coach remain the Coach's property. By uploading content to GameGround, the Coach grants GameGround a non-exclusive, royalty-free licence to host, display, and promote that content in connection with the Coach's profile and the platform." },
    { heading: "9. Data Privacy", body:
      "GameGround processes the Coach's personal data in accordance with its Privacy Policy and applicable Indian data-protection law. The Coach shall handle player personal data confidentially, use it solely for delivering coaching services, and not disclose it to third parties without consent." },
    { heading: "10. Suspension & Termination", body:
      "GameGround may suspend or terminate the Coach's account for breach of this Agreement, policy violations, safety concerns, fraudulent activity, or sustained poor performance. Either party may terminate this Agreement on reasonable notice. Outstanding confirmed earnings remain payable on termination." },
    { heading: "11. Independent Contractor Status", body:
      "The Coach is an independent contractor and not an employee, agent, or partner of GameGround. Nothing in this Agreement creates an employment relationship, and the Coach is not entitled to employee benefits. The Coach controls the manner and means of delivering coaching services." },
    { heading: "12. Governing Law (India)", body:
      "This Agreement is governed by the laws of India. The parties submit to the exclusive jurisdiction of the courts of Kozhikode, Kerala, India for any dispute arising out of or in connection with this Agreement." },
    { heading: "13. Electronic Signature Consent", body:
      "The Coach consents to transact electronically and agrees that typing their full legal name as a signature, together with checking the acceptance boxes, constitutes a legally binding electronic signature under the Information Technology Act, 2000. The Coach agrees that electronic records of this Agreement are admissible and enforceable." },
  ],
};

const REGISTRY: Record<string, Agreement> = { "v1.0": V1_0 };

export function getAgreement(version: string): Agreement {
  const a = REGISTRY[version];
  if (!a) throw new Error(`Unknown agreement version: ${version}`);
  return a;
}

/** Deterministic plain-text rendering — the canonical input for hashing + PDF. */
export function agreementPlainText(version: string): string {
  const a = getAgreement(version);
  const header = `GameGround Coach Partnership Agreement\nVersion: ${a.version}\nEffective: ${a.effectiveDate}\nGoverning law: ${a.jurisdiction}`;
  const body = a.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n");
  return `${header}\n\n${body}`;
}

export function estimatedReadingMinutes(version: string): number {
  const words = agreementPlainText(version).trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
