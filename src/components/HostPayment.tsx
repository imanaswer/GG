"use client";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Copy, QrCode, MessageCircle, Check, IndianRupee, Info } from "lucide-react";
import type { HostPayment } from "@/hooks/useData";
import { VENUE_PAYMENT_DISCLAIMER } from "@/lib/hostPayment";

// UI for entry fees that Game Ground does not process. Every surface that shows a
// player-hosted game's fee renders from here, so the "we are not the merchant"
// message can't be present on one screen and missing on another.

const card: React.CSSProperties = {
  padding: 20, borderRadius: 20,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.07)",
};
const label: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
  color: "rgba(255,255,255,0.42)", marginBottom: 6,
};
const value: React.CSSProperties = { fontSize: 14, color: "rgba(255,255,255,0.88)", lineHeight: 1.55 };

function Disclaimer({ text }: { text: string }) {
  return (
    <div style={{
      display: "flex", gap: 9, alignItems: "flex-start",
      padding: "10px 12px", borderRadius: 12, marginTop: 14,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}>
      <Info size={13} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0, marginTop: 2 }} />
      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function CopyUpi({ upiId }: { upiId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(upiId);
          setCopied(true);
          toast.success("UPI ID copied");
          setTimeout(() => setCopied(false), 2000);
        } catch { toast.error("Couldn't copy — long-press the ID to select it"); }
      }}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
        height: 40, padding: "0 16px", borderRadius: 100, flex: 1,
        background: "rgba(255,255,255,0.05)", color: "#fff",
        border: "1px solid rgba(255,255,255,0.12)",
        fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy UPI ID"}
    </button>
  );
}

/** The informational payment block on a game's detail page. */
export function HostPaymentCard({ payment }: { payment: HostPayment }) {
  const [showQr, setShowQr] = useState(false);

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
        <IndianRupee size={15} style={{ color: "#fff" }} />
        <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff" }}>
          Payment
        </h3>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <div>
          <div style={label}>Entry fee</div>
          <div style={{ ...value, fontSize: 20, fontWeight: 800, color: "#fff" }}>
            ₹{payment.amount} <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>per player</span>
          </div>
        </div>

        <div>
          <div style={label}>Payment method</div>
          <div style={value}>{payment.methodLabel}</div>
        </div>

        {payment.upiId && (
          <div>
            <div style={label}>Host UPI</div>
            <div style={{ ...value, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all" }}>
              {payment.upiId}
            </div>
          </div>
        )}

        {payment.instructions && (
          <div>
            <div style={label}>Instructions</div>
            <div style={{ ...value, whiteSpace: "pre-wrap" }}>{payment.instructions}</div>
          </div>
        )}

        {(payment.upiId || payment.qrUrl) && (
          <div style={{ display: "flex", gap: 8 }}>
            {payment.upiId && <CopyUpi upiId={payment.upiId} />}
            {payment.qrUrl && (
              <button
                onClick={() => setShowQr(v => !v)}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                  height: 40, padding: "0 16px", borderRadius: 100, flex: 1,
                  background: "rgba(255,255,255,0.05)", color: "#fff",
                  border: "1px solid rgba(255,255,255,0.12)",
                  fontSize: 12.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
                }}
              >
                <QrCode size={14} /> {showQr ? "Hide QR" : "View QR code"}
              </button>
            )}
          </div>
        )}

        {showQr && payment.qrUrl && (
          <div style={{
            display: "flex", justifyContent: "center", padding: 16,
            background: "#fff", borderRadius: 16,
          }}>
            <Image
              src={payment.qrUrl}
              alt="Host's UPI QR code"
              width={220}
              height={220}
              style={{ width: 220, height: 220, objectFit: "contain" }}
              unoptimized
            />
          </div>
        )}
      </div>

      <Disclaimer text={payment.disclaimer} />
      {payment.venueNote && (
        <>
          <div style={{ ...label, marginTop: 16 }}>Venue payment</div>
          <div style={{ ...value, whiteSpace: "pre-wrap" }}>{payment.venueNote}</div>
          <Disclaimer text={VENUE_PAYMENT_DISCLAIMER} />
        </>
      )}
    </div>
  );
}

/**
 * Shown to a player after they join a paid game — the fee is still outstanding
 * and settling it is now their move, not something the join completed.
 */
export function PayHostPanel({
  payment, gameId, myPaymentStatus, whatsAppHref,
}: {
  payment: HostPayment;
  gameId: string;
  myPaymentStatus?: string;
  whatsAppHref?: string | null;
}) {
  const [status, setStatus] = useState(myPaymentStatus ?? "pending");
  const [saving, setSaving] = useState(false);
  const paid = status === "paid";

  const mark = async (next: "paid" | "pending") => {
    setSaving(true);
    try {
      const r = await fetch(`/api/games/${gameId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ paymentStatus: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j?.error ?? "Couldn't update payment status");
      setStatus(next);
      toast.success(next === "paid" ? "Marked as paid — the host will confirm." : "Marked as not paid.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      ...card,
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.22)",
    }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
        Next step — pay the host directly
      </div>
      <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.55, marginBottom: 14 }}>
        ₹{payment.amount} via {payment.methodLabel}.
        {payment.instructions ? ` ${payment.instructions}` : ""}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {payment.upiId && <CopyUpi upiId={payment.upiId} />}
        {whatsAppHref && (
          <a
            href={whatsAppHref} target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              height: 40, padding: "0 16px", borderRadius: 100, flex: 1,
              background: "rgba(37,211,102,0.1)", color: "#25d366",
              border: "1px solid rgba(37,211,102,0.3)",
              fontSize: 12.5, fontWeight: 700, textDecoration: "none",
            }}
          >
            <MessageCircle size={14} /> Message host
          </a>
        )}
      </div>

      <button
        onClick={() => mark(paid ? "pending" : "paid")}
        disabled={saving}
        style={{
          width: "100%", height: 42, borderRadius: 100, marginTop: 8,
          background: paid ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.05)",
          color: paid ? "#4ade80" : "#fff",
          border: `1px solid ${paid ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.12)"}`,
          fontSize: 12.5, fontWeight: 700, fontFamily: "inherit",
          cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1,
        }}
      >
        {paid ? <><Check size={14} style={{ verticalAlign: "-2px" }} /> Marked as paid — tap to undo</> : "Mark as paid"}
      </button>

      <Disclaimer text={payment.disclaimer} />
    </div>
  );
}

/**
 * The host's view of who has paid. Records what the host confirms — Game Ground
 * has no visibility into the transfer, so there are no totals or balances here.
 */
export function HostPaymentRoster({
  gameId, players,
}: {
  gameId: string;
  players: { userId: string; name: string; paymentStatus?: string }[];
}) {
  const [state, setState] = useState<Record<string, string>>(
    () => Object.fromEntries(players.map(p => [p.userId, p.paymentStatus ?? "pending"])),
  );
  const [busy, setBusy] = useState<string | null>(null);

  const mark = async (userId: string, next: "paid" | "pending") => {
    setBusy(userId);
    try {
      const r = await fetch(`/api/games/${gameId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, paymentStatus: next }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j?.error ?? "Couldn't update payment status");
      setState(s => ({ ...s, [userId]: next }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  if (players.length === 0) return null;

  return (
    <div style={card}>
      <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", marginBottom: 4 }}>
        Fee collection
      </h3>
      <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: 16 }}>
        Mark who has paid you. This is your own record — Game Ground does not process or verify these payments.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map(p => {
          const paid = state[p.userId] === "paid";
          return (
            <div key={p.userId} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
              padding: "10px 12px", borderRadius: 12,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 13, color: "#fff", fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
              <button
                onClick={() => mark(p.userId, paid ? "pending" : "paid")}
                disabled={busy === p.userId}
                style={{
                  flexShrink: 0, height: 30, padding: "0 12px", borderRadius: 100,
                  background: paid ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.04)",
                  color: paid ? "#4ade80" : "rgba(255,255,255,0.6)",
                  border: `1px solid ${paid ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.12)"}`,
                  fontSize: 11.5, fontWeight: 700, fontFamily: "inherit",
                  cursor: busy === p.userId ? "not-allowed" : "pointer",
                  opacity: busy === p.userId ? 0.6 : 1,
                }}
              >
                {paid ? "Paid" : "Pending"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
