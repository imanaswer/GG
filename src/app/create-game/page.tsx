"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Lock, Trophy, MapPin, CalendarClock, Users, FileText, Sparkles, ArrowRight } from "lucide-react";
import { NavBar } from "@/components/NavBar";
import { Input, Label, Textarea } from "@/components/ui";
import { useCreateGame } from "@/hooks/useData";
import { useAuth } from "@/context/AuthContext";
import { STORY } from "@/lib/premium-images";

const SPORTS = ["Basketball","Football","Cricket","Badminton","Tennis","Volleyball","Other"];
const LEVELS = ["Beginner","Intermediate","Advanced","All Levels"];
const DURATIONS = [{ l:"30 min",v:30},{l:"1 hour",v:60},{l:"90 min",v:90},{l:"2 hours",v:120},{l:"3 hours",v:180},{l:"4 hours",v:240}];

export default function CreateGamePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const createGame = useCreateGame();
  const [form, setForm] = useState({
    sport: "", title: "", location: "", address: "",
    date: "", time: "", duration: "90",
    slots: "", skillLevel: "", cost: "Free", costAmount: "0", description: "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sport || !form.title || !form.location || !form.date || !form.time || !form.slots || !form.skillLevel) return;
    await createGame.mutateAsync({
      sport: form.sport, title: form.title, location: form.location,
      address: form.address || undefined,
      scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
      duration: parseInt(form.duration), slots: parseInt(form.slots),
      skillLevel: form.skillLevel, cost: form.cost || "Free",
      costAmount: parseInt(form.costAmount) || 0,
      description: form.description || undefined,
    });
    router.push("/play");
  };

  if (!loading && !user) return <AuthGate />;

  const canSubmit = form.sport && form.skillLevel && form.title && form.location && form.date && form.time && form.slots;

  return (
    <div style={{ minHeight: "100vh", background: "#050505" }}>
      <NavBar />

      {/* Hero */}
      <section style={{ position: "relative", paddingTop: 96, paddingBottom: 48, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          <Image
            src={STORY.play.src}
            alt={STORY.play.alt}
            fill
            priority
            quality={80}
            sizes="100vw"
            style={{ objectFit: "cover", opacity: 0.3 }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(5,5,5,0.55) 0%, rgba(5,5,5,0.85) 70%, #050505 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 60% 50% at 15% 30%, rgba(230,57,70,0.18) 0%, transparent 60%)",
          }} />
        </div>

        <div className="container-lg" style={{ position: "relative", zIndex: 1, maxWidth: 820, margin: "0 auto", padding: "40px 24px 0" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "7px 14px", borderRadius: 100,
            background: "rgba(230,57,70,0.12)",
            border: "1px solid rgba(230,57,70,0.3)",
            fontSize: 11.5, fontWeight: 600, color: "#ff6b7a",
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: 20,
          }}>
            <Sparkles size={12} /> Host a game
          </div>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(36px, 5vw, 60px)",
            lineHeight: 1.04,
            fontWeight: 400,
            color: "#fff",
            letterSpacing: "-0.035em",
            marginBottom: 16,
          }}>
            Set the game. <em style={{ fontStyle: "italic", color: "#ff6b7a" }}>Find the people.</em>
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, maxWidth: 560 }}>
            Pick a sport, set a time, invite the neighbourhood. A well-hosted pickup game fills up in under an hour on Game Ground.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "0 24px 80px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Sport & Skill */}
          <SectionCard Icon={Trophy} title="Sport & skill" hint="Pick the sport first — we'll tune the rest to match.">
            <FieldRow label="Sport" required>
              <PillSelect
                options={SPORTS.map(s => ({ l: s, v: s }))}
                value={form.sport}
                onChange={v => set("sport", v)}
              />
            </FieldRow>
            <FieldRow label="Skill level" required>
              <PillSelect
                options={LEVELS.map(l => ({ l, v: l }))}
                value={form.skillLevel}
                onChange={v => set("skillLevel", v)}
              />
            </FieldRow>
            <FieldRow label="Game title" required>
              <Input placeholder="e.g. 5v5 pickup basketball, SM Street" value={form.title} onChange={e => set("title", e.target.value)} required />
            </FieldRow>
          </SectionCard>

          {/* Location */}
          <SectionCard Icon={MapPin} title="Where you&rsquo;re playing">
            <FieldRow label="Venue name" required>
              <Input placeholder="e.g. SM Street Court, EMS Stadium" value={form.location} onChange={e => set("location", e.target.value)} required />
            </FieldRow>
            <FieldRow label="Full address" hint="Helps first-timers find the gate.">
              <Input placeholder="e.g. SM Street, Kozhikode 673001" value={form.address} onChange={e => set("address", e.target.value)} />
            </FieldRow>
          </SectionCard>

          {/* Schedule */}
          <SectionCard Icon={CalendarClock} title="When">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
              <FieldRow label="Date" required>
                <Input type="date" value={form.date} min={new Date().toISOString().split("T")[0]} onChange={e => set("date", e.target.value)} required />
              </FieldRow>
              <FieldRow label="Start time" required>
                <Input type="time" value={form.time} onChange={e => set("time", e.target.value)} required />
              </FieldRow>
            </div>
            <FieldRow label="Duration">
              <PillSelect
                options={DURATIONS.map(d => ({ l: d.l, v: d.v }))}
                value={form.duration}
                onChange={v => set("duration", v)}
              />
            </FieldRow>
          </SectionCard>

          {/* Players & Cost */}
          <SectionCard Icon={Users} title="Players & cost">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="two-col">
              <FieldRow label="Max players" required>
                <Input type="number" min="2" max="100" placeholder="e.g. 10" value={form.slots} onChange={e => set("slots", e.target.value)} required />
              </FieldRow>
              <FieldRow label="Cost per player" hint="Free, or a number — we&rsquo;ll format it.">
                <Input placeholder="Free or ₹100" value={form.cost} onChange={e => {
                  const v = e.target.value;
                  set("cost", v);
                  const n = parseInt(v.replace(/\D/g, ""));
                  set("costAmount", isNaN(n) ? "0" : String(n));
                }} />
              </FieldRow>
            </div>
          </SectionCard>

          {/* Description */}
          <SectionCard Icon={FileText} title="Anything else?" hint="House rules, who it&rsquo;s for, what to bring.">
            <Textarea
              placeholder="e.g. Friendly 5v5, bring light and dark shirts. Parking available. Skill level: solid beginners welcome."
              rows={4}
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </SectionCard>

          {/* Submit bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "18px 22px",
            background: "linear-gradient(135deg, rgba(230,57,70,0.08) 0%, rgba(11,11,11,0.9) 100%)",
            border: "1px solid rgba(230,57,70,0.2)",
            borderRadius: 18,
            marginTop: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
                {canSubmit ? "Ready to publish?" : "A few more fields to fill"}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)" }}>
                Your game will appear instantly in the /play feed.
              </div>
            </div>
            <Link href="/play" style={{
              height: 44, padding: "0 18px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,255,255,0.08)",
              textDecoration: "none",
              fontSize: 13, fontWeight: 600,
              display: "inline-flex", alignItems: "center",
            }}>
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createGame.isPending || !canSubmit}
              style={{
                height: 44, padding: "0 22px", borderRadius: 12,
                fontSize: 13.5, fontWeight: 700,
                background: canSubmit ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.04)",
                color: canSubmit ? "#fff" : "rgba(255,255,255,0.4)",
                border: canSubmit ? "none" : "1px solid rgba(255,255,255,0.06)",
                cursor: (createGame.isPending || !canSubmit) ? "not-allowed" : "pointer",
                opacity: createGame.isPending ? 0.6 : 1,
                fontFamily: "inherit",
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: canSubmit ? "0 6px 24px rgba(230,57,70,0.35)" : "none",
              }}
            >
              {createGame.isPending ? "Publishing…" : (<>Publish game <ArrowRight size={14} /></>)}
            </button>
          </div>
        </form>
      </main>

      <style>{`
        @media (max-width: 780px) {
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function AuthGate() {
  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column" }}>
      <NavBar />
      <main style={{
        flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "96px 24px 48px",
      }}>
        <div style={{
          maxWidth: 480,
          width: "100%",
          padding: "40px 36px",
          background: "#0b0b0b",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 24,
          textAlign: "center",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            margin: "0 auto 24px",
            background: "rgba(230,57,70,0.1)",
            border: "1px solid rgba(230,57,70,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={26} color="#e63946" />
          </div>
          <h2 style={{
            fontFamily: "var(--font-serif)",
            fontSize: 30, fontWeight: 400,
            color: "#fff", letterSpacing: "-0.03em",
            marginBottom: 10,
          }}>
            Sign in to host a game.
          </h2>
          <p style={{ fontSize: 14.5, color: "rgba(255,255,255,0.58)", lineHeight: 1.65, marginBottom: 28 }}>
            You need an account so players can message you and confirm their spot. It takes under a minute.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{
              height: 44, padding: "0 22px", borderRadius: 12,
              background: "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)",
              color: "#fff", textDecoration: "none",
              fontSize: 13.5, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 7,
              boxShadow: "0 6px 24px rgba(230,57,70,0.3)",
            }}>
              Sign in <ArrowRight size={14} />
            </Link>
            <Link href="/register" style={{
              height: 44, padding: "0 22px", borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              textDecoration: "none",
              fontSize: 13.5, fontWeight: 600,
              display: "inline-flex", alignItems: "center",
            }}>
              Create account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionCard({
  Icon, title, hint, children,
}: {
  Icon: typeof Trophy;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      padding: "24px 26px",
      background: "#0b0b0b",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 18,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: hint ? 6 : 20 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(230,57,70,0.1)",
          border: "1px solid rgba(230,57,70,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={15} color="#e63946" />
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      {hint && <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", marginBottom: 18, paddingLeft: 46 }}>{hint}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>{children}</div>
    </div>
  );
}

function FieldRow({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <Label>
        {label}
        {required && <span style={{ color: "#e63946", marginLeft: 4 }}>*</span>}
      </Label>
      {children}
      {hint && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

function PillSelect({ options, value, onChange }: { options: { l: string; v: string | number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map(o => {
        const active = value === String(o.v);
        return (
          <button key={String(o.v)} type="button" onClick={() => onChange(String(o.v))} style={{
            padding: "8px 16px", borderRadius: 100,
            fontSize: 13, fontWeight: 600,
            cursor: "pointer",
            border: "1px solid",
            fontFamily: "inherit",
            background: active ? "linear-gradient(135deg, #e63946 0%, #b91c2d 100%)" : "rgba(255,255,255,0.02)",
            color: active ? "#fff" : "rgba(255,255,255,0.6)",
            borderColor: active ? "transparent" : "rgba(255,255,255,0.08)",
            boxShadow: active ? "0 4px 14px rgba(230,57,70,0.3)" : "none",
            transition: "all 160ms ease",
          }}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}
