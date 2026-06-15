// IMMUTABILITY RULE: once v1.0 has been signed by anyone, NEVER edit the v1.0
// entry below. Ship changes as a new version (v1.1, ...). The hash + "always
// show the accepted version" guarantees depend on this text being frozen.
//
// Body text may contain "\n" to separate paragraphs/sub-points; renderers
// (onboarding page, admin detail, PDF) split on it. Group-title entries have an
// empty body and act as section dividers.

export type AgreementSection = { heading: string; body: string };
export type Agreement = {
  version: string;
  title: string;
  effectiveDate: string;
  jurisdiction: string;
  sections: AgreementSection[];
};

export const CURRENT_AGREEMENT_VERSION = "v1.0";

const V1_0: Agreement = {
  version: "v1.0",
  title: "Coach Terms & Conditions",
  effectiveDate: "2026-06-15",
  jurisdiction: "Kozhikode, Kerala, India",
  sections: [
    { heading: "Introduction", body:
      "Welcome to Game Ground (gameground.net). These Coach Terms & Conditions (\"Terms\") constitute a legally binding electronic agreement between Game Ground (incubated at St. Joseph's College, Devagiri, Kozhikode) and any independent sports coach, trainer, or academy (\"Coach\", \"Partner\", or \"You\") registering on our platform.\nBy checking the \"I Agree\" box or creating a profile on the platform, you agree to comply with and be bound by these Terms." },

    { heading: "1. Definitions and Scope", body: "" },
    { heading: "1.1 Marketplace Services", body:
      "Game Ground operates an online hyperlocal marketplace that displays sports coaching batches to interested parents and students in Kozhikode." },
    { heading: "1.2 Role of Game Ground", body:
      "Game Ground acts strictly as an automated marketplace and enrollment facilitator. Game Ground does not employ any Coach, nor does it maintain operational control over the physical execution of your training sessions." },
    { heading: "1.3 Definitions", body:
      "\"First Month\" means the initial 30-day period starting from the date the parent completes the first month's fee payment through the Game Ground payment gateway.\n\"Batch\" means a scheduled series of coaching sessions as displayed on the Coach's profile (including group size, duration, and frequency).\n\"Working Day\" means Monday through Friday, excluding national and Kerala state public holidays." },

    { heading: "2. First-Month Booking & Revenue Split", body: "" },
    { heading: "2.1 Mandatory First Payment Through Game Ground", body:
      "To prevent fraudulent bookings and secure a student's commitment, the entire fee for the first month of any batch must be processed securely through the Game Ground payment gateway. Coaches are strictly prohibited from accepting first-month payment directly from any parent introduced via the platform." },
    { heading: "2.2 One-Time Commission (Agreed Percentage)", body:
      "Game Ground will retain a one-time finder's fee of [ ______ ]% (or capped at a maximum of ₹[ ____________ ], whichever is lower) from the first month's payment. This is the agreed-upon commission split referred to throughout these Terms. The remaining balance belongs to the Coach." },
    { heading: "2.3 Month 2 Financial Autonomy", body:
      "From the second month onward, the student relationship transfers completely to the Coach. The Coach is entirely responsible for collecting all future recurring monthly fees directly via Cash, UPI, or Bank Transfer. Game Ground charges 0% commission on any revenue from Month 2 onward." },
    { heading: "2.4 Payout & Settlement Timeline", body:
      "All first-month coaching fees collected by Game Ground on your behalf will be securely consolidated at the end of each calendar month (i.e., all fees received during that month). Game Ground guarantees that your total consolidated payout (net of the agreed-upon commission split defined in Clause 2.2) will be transferred directly to your designated bank account or UPI ID within fourteen (14) Working Days after the last day of that calendar month." },
    { heading: "2.5 Non-Circumvention (Anti-Bypass)", body:
      "Coach agrees not to solicit or accept first-month payment directly from any parent introduced via Game Ground. Any violation allows Game Ground to permanently ban the Coach and retain any pending payouts as liquidated damages, in addition to any other legal remedies." },

    { heading: "3. Student Attendance & No-Refund Policy", body: "" },
    { heading: "3.1 Coach Revenue Protection", body:
      "Once a parent securely books and pays for a monthly batch through Game Ground's payment gateway, that slot is officially locked." },
    { heading: "3.2 No Refund for Student Absence - With Exception", body:
      "If a student fails to attend classes, misses sessions, or unilaterally decides to drop out halfway through their first month, Game Ground will not issue a refund to the parent. The Coach will still receive their agreed-upon commission split (as defined in Clause 2.2) of that first month's fee, regardless of student attendance.\nException: If the student's withdrawal is directly caused by the Coach's breach of these Terms (as determined by Game Ground in good faith), the refund provisions of Clause 3.3 shall apply." },
    { heading: "3.3 Coach-Side Non-Performance", body:
      "If a Coach cancels a scheduled batch, changes session timings without explicit parent consent, or fails to provide the coaching services promised on their profile, Game Ground reserves the absolute right to issue a full refund to the affected parent. Any refunds issued due to Coach cancellation or non-performance will be directly debited from the Coach's accumulated end-of-month payout balance." },

    { heading: "4. Data Privacy & Confidentiality (Coach Does Not Receive Parent Contacts)", body: "" },
    { heading: "4.1 Coach Will Not See Parent Contact Details - With Consent Exception", body:
      "To prevent first-month bypass and protect parent privacy, Game Ground will not share the parent's direct contact number or email address with the Coach before or during the first month. All communication between Coach and parent for the first month shall occur through Game Ground's masked communication channel (e.g., in-app chat or temporary phone number). The Coach will only receive the parent's needs, location, and child's age - not any personally identifying contact information.\nException: Game Ground may share the parent's direct contact details only if the parent provides explicit written consent after the first month, or if required for emergency coordination approved by Game Ground." },
    { heading: "4.2 Confidentiality Obligation", body:
      "Coach agrees to keep all student and parent information (including any names, chat history, or other identifiers) strictly confidential and shall not share such information with any third party. Coach must delete all such data within 30 days after the coaching relationship ends. Violation may result in immediate termination and legal action." },

    { heading: "5. Coach Verification, Safety, and Tax Responsibility", body: "" },
    { heading: "5.1 Background Verification", body:
      "Coach represents that, to the best of their knowledge, they have no criminal convictions that would disqualify them from working with minors. Coach agrees to promptly inform Game Ground of any such conviction. Game Ground reserves the right to conduct a background check at its expense. Failure to cooperate with a requested background check may result in immediate suspension." },
    { heading: "5.2 Safe Environment", body:
      "Coach must maintain a safe training environment, provide first-aid basics where appropriate, and report any incidents (including injuries) to Game Ground within 24 hours." },
    { heading: "5.3 Tax Responsibility", body:
      "Coach is solely responsible for all applicable taxes (GST, income tax, etc.) on fees received from parents. Game Ground may deduct TDS (Tax Deducted at Source) if required by law and will provide Form 16A or equivalent." },

    { heading: "6. Profile Verification, Audits, Ratings & Suspension Rights", body: "" },
    { heading: "6.1 Manual Quality Control", body:
      "Game Ground uses manual phone-call verifications and feedback logs to maintain a trusted platform for parents in Calicut." },
    { heading: "6.2 Parent Ratings & Public Feedback", body:
      "Coach agrees that Game Ground may collect feedback from parents (via calls or forms) and publish aggregated ratings on the Coach's profile. Coach may respond to negative feedback once. Ratings are displayed publicly and may affect visibility." },
    { heading: "6.3 Right to Suspend or Delete", body:
      "Game Ground reserves the ultimate, unconditional right to temporarily suspend, restrict, or permanently delete a Coach's online profile and listings without prior notice if:\n- A Coach receives verified, repeated safety or quality complaints from parents.\n- A Coach provides fraudulent, misleading, or incorrect information regarding certifications, fees, or venue locations.\n- A Coach attempts to bypass the platform's payment gateway for a new student's first-month booking (see Clause 2.5)." },
    { heading: "6.4 Editing Rights", body:
      "Game Ground reserves the right to edit profile descriptions, optimize uploaded images, and publish verified user ratings without requiring explicit permission from the Coach." },
    { heading: "6.5 Intellectual Property License (Limited)", body:
      "Coach grants Game Ground a royalty-free, worldwide license to use, modify, reproduce, and display any content (images, text, videos) uploaded to the Coach's profile for as long as the Coach maintains an active profile on the platform, and for a reasonable retention period thereafter (not exceeding 1 year after termination). Game Ground may continue to display existing content for previously completed transactions (e.g., past ratings) after termination. Coach retains ownership of original content. Moral rights are not waived; Coach agrees not to assert moral rights in a manner that would unreasonably prevent Game Ground from using the content as described." },

    { heading: "7. Termination & Force Majeure", body: "" },
    { heading: "7.1 Termination by Coach", body:
      "Coach may provide 15 days' written notice via email to support@gameground.net to delete their profile or stop accepting new leads. Termination will take effect after the notice period, provided no ongoing first-month bookings exist. Game Ground will not assign new leads after notice is given. If a first-month booking is in progress, termination will only take effect after that booking is completed." },
    { heading: "7.2 Termination by Game Ground", body:
      "Game Ground may terminate this agreement instantly for breach of any material term (e.g., bypass, fraud, safety violation)." },
    { heading: "7.3 Force Majeure", body:
      "Neither party is liable for delays or non-performance caused by events beyond reasonable control (pandemic, natural disaster, government orders, strikes). If force majeure persists for more than 30 days, either party may terminate without penalty." },

    { heading: "8. Dispute Resolution & Governing Law", body: "" },
    { heading: "8.1 Internal Escalation", body:
      "Any dispute arising from these Terms or financial settlements shall first be attempted to be resolved through a 7-day internal review. Send a written description to disputes@gameground.net." },
    { heading: "8.2 Arbitration for Small Claims", body:
      "If the dispute remains unresolved and the amount in question is ₹25,000 or less, either party may request binding arbitration by a sole arbitrator mutually agreed in Kozhikede. If the parties cannot agree on an arbitrator within 10 days, either party may request the Kozhikode District Court to appoint one. Each party shall bear its own costs, and the arbitrator's fee shall be shared equally. The arbitrator's decision shall be final." },
    { heading: "8.3 Jurisdiction for Larger Disputes", body:
      "Disputes exceeding ₹25,000 shall be subject to the exclusive jurisdiction of the courts in Kozhikode, Kerala, India." },
    { heading: "8.4 Governing Law", body:
      "These Terms are governed by the laws of India." },

    { heading: "9. Amendments & Notices", body: "" },
    { heading: "9.1 Right to Amend - With Consent for Material Changes", body:
      "Game Ground may update these Terms from time to time. Material changes (including but not limited to changes to the commission percentage, fee structure, or liability cap) will require Coach's explicit consent (e.g., clicking \"Accept\" on a new agreement). Non-material changes (e.g., clarification of existing clauses, correction of typographical errors) will be notified via email or dashboard notice with 15 days' advance notice. Continued use after the effective date of non-material changes constitutes acceptance. If a Coach does not agree to a material change, they may delete their profile before the change takes effect." },
    { heading: "9.2 Acceptance", body:
      "Continued use of the platform after the effective date of non-material changes constitutes acceptance of the revised Terms. For material changes, continued use after explicit consent is required." },

    { heading: "10. Indemnification & Liability Limitation", body: "" },
    { heading: "10.1 Indemnification", body:
      "Coach agrees to indemnify and hold harmless Game Ground from any legal claims, parental disputes, or financial losses arising out of Coach's conduct at the training venue." },
    { heading: "10.2 No Liability for Physical Injury", body:
      "Game Ground is not liable for any physical injuries, property damage, theft, or accidents occurring during coaching sessions at any external turf, court, or academy grounds." },
    { heading: "10.3 Limitation of Liability", body:
      "Game Ground's total aggregate liability under these Terms (including for delayed payouts, data loss, or any other claim) shall not exceed the total commission fees paid by Coach to Game Ground in the six months preceding the claim." },

    { heading: "11. General Provisions", body: "" },
    { heading: "11.1 Entire Agreement", body:
      "These Terms constitute the entire agreement between the parties with respect to the subject matter hereof and supersede all prior discussions, agreements, or understandings." },
    { heading: "11.2 Severability", body:
      "If any provision of these Terms is found to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary, and the remaining provisions shall continue in full force and effect." },
    { heading: "11.3 No Waiver", body:
      "Failure by Game Ground to enforce any right or provision of these Terms shall not constitute a waiver of future enforcement of that right or provision." },
  ],
};

const REGISTRY: Record<string, Agreement> = { "v1.0": V1_0 };

export function getAgreement(version: string): Agreement {
  const a = REGISTRY[version];
  if (!a) throw new Error(`Unknown agreement version: ${version}`);
  return a;
}

/** Deterministic plain-text rendering - the canonical input for hashing + PDF. */
export function agreementPlainText(version: string): string {
  const a = getAgreement(version);
  const header = `Game Ground ${a.title}\nVersion: ${a.version}\nEffective: ${a.effectiveDate}\nGoverning law: ${a.jurisdiction}`;
  const body = a.sections.map((s) => (s.body ? `${s.heading}\n${s.body}` : s.heading)).join("\n\n");
  return `${header}\n\n${body}`;
}

export function estimatedReadingMinutes(version: string): number {
  const words = agreementPlainText(version).trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
