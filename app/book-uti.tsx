"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";

// Design settings (were editable props in the Claude Design file).
const CURRENCY: "kisses" | "hugs" | "forehead kisses" = "kisses";
const SHOW_FINE_PRINT = true;

const ACCENT = "oklch(0.62 0.19 25)";
const ACCENT_TEXT = "oklch(0.55 0.19 25)";
const MONO: CSSProperties = { fontFamily: "var(--font-plex-mono), monospace" };

type Service = {
  id: string;
  name: string;
  desc: string;
  price: number;
  dur: string;
};
type Urgency = {
  id: string;
  tag: string;
  name: string;
  desc: string;
  mult: number;
  resp: string;
  reply: string;
};
type Addon = {
  id: string;
  name: string;
  desc: string;
  price: number;
  locked?: boolean;
};

const SERVICES: Service[] = [
  {
    id: "dinner",
    name: "Dinner Date",
    desc: "Shows up on time. Holds door. Does not order the same thing as you.",
    price: 12,
    dur: "~2 hrs",
  },
  {
    id: "shopping",
    name: "Shopping Bag Mule",
    desc: 'Carries all bags. Holds your purse without comment. Says "looks great" on cue.',
    price: 8,
    dur: "Until you are done",
  },
  {
    id: "show",
    name: "Watch Your Show",
    desc: "Full attention. Phone face-down. Will learn at least three character names.",
    price: 6,
    dur: "1 episode (or 7)",
  },
  {
    id: "massage",
    name: "Back Rub/Massage — Tier 1 Support",
    desc: "15 minutes guaranteed. Extensions subject to negotiation.",
    price: 10,
    dur: "15 min*",
  },
  {
    id: "snack",
    name: "Emergency Snack Run",
    desc: 'Dispatched within 20 min. Will not ask "are you sure that\'s all?"',
    price: 5,
    dur: "20 min SLA",
  },
  {
    id: "vent",
    name: "Venting Session",
    desc: "Listening only. Solutions module is disabled for this session.",
    price: 7,
    dur: "As long as needed",
  },
  {
    id: "bug",
    name: "Bug Removal/Maintenance",
    desc: "Spiders, moths, the mystery thing in the bathroom. Humane or not, your call.",
    price: 3,
    dur: "Immediate",
  },
  {
    id: "photo",
    name: "Photographer Mode",
    desc: "Minimum 40 shots. Will crouch for the good angle. No thumb in frame.",
    price: 9,
    dur: "Golden hour",
  },
];

const URGENCIES: Urgency[] = [
  {
    id: "whenever",
    tag: "P4",
    name: "Whenever",
    desc: "No rush. Response within 24h.",
    mult: 1,
    resp: "Within 24 hours",
    reply: "ok",
  },
  {
    id: "soon",
    tag: "P3",
    name: "Soon-ish",
    desc: "Today would be nice. Response within 3h.",
    mult: 1.2,
    resp: "Within 3 hours",
    reply: "on it",
  },
  {
    id: "hangry",
    tag: "P1",
    name: "Hangry",
    desc: "Food-related incident. Response within 30 min.",
    mult: 1.5,
    resp: "30 minutes",
    reply: "leaving now. what do you want. actually I know.",
  },
  {
    id: "fine",
    tag: "P0",
    name: '"I\'m fine."',
    desc: "Critical incident. All other tasks cancelled.",
    mult: 3,
    resp: "Immediately. He is already running.",
    reply: "what did I do. I'm coming. I love you.",
  },
];

const ADDONS: Addon[] = [
  {
    id: "fake",
    name: "Fake enthusiasm",
    desc: "Standard with all packages",
    price: 0,
    locked: true,
  },
  {
    id: "eyes",
    name: "Sustained eye contact",
    desc: "No glancing at the TV behind you",
    price: 2,
  },
  {
    id: "shirt",
    name: "Wears the shirt you like",
    desc: "The blue one. Ironed.",
    price: 3,
  },
  {
    id: "nocomplain",
    name: "Zero complaining",
    desc: "Not even under his breath",
    price: 5,
  },
  {
    id: "remember",
    name: "Remembers this later",
    desc: "Details retained beyond 48 hours",
    price: 8,
  },
  {
    id: "flowers",
    name: "Surprise flowers",
    desc: "You will act surprised",
    price: 15,
  },
];

const REASONS = [
  "Ranked match (can't pause)",
  "Nap — scheduled maintenance",
  "Gym (allegedly)",
  "Staring at fridge",
];
const TIMES = ["10:00", "12:30", "15:00", "18:00", "20:30", "23:00"];

const UNITS = {
  kisses: ["kiss", "kisses", "K"],
  hugs: ["hug", "hugs", "H"],
  "forehead kisses": ["forehead kiss", "forehead kisses", "FK"],
}[CURRENCY];

const isFootballDay = (d: Date) => d.getDay() === 3 || d.getDay() === 6;

function nextDays() {
  const out: Date[] = [];
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(t);
    d.setDate(t.getDate() + i);
    out.push(d);
  }
  return out;
}

function slotsFor(i: number) {
  return TIMES.map((time, k) => {
    if (k === 5) return { time, note: "Available (drowsy)", ok: true };
    const blocked = (i * 3 + k) % 4 === 1;
    return {
      time,
      note: blocked ? REASONS[(i + k) % 4] : "Available",
      ok: !blocked,
    };
  });
}

const sel = (on: boolean) => ({
  borderColor: on ? ACCENT : "#dedad3",
  background: on ? "oklch(0.97 0.02 25)" : "#fff",
});

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #dedad3",
  borderRadius: 14,
  padding: 22,
};

function StepHeader({
  n,
  title,
  sub,
}: {
  n: string;
  title: string;
  sub?: string;
}) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 4,
        }}
      >
        <span style={{ ...MONO, fontSize: 12, color: "#8a857d" }}>{n}</span>
        <h2
          style={{
            fontSize: 20,
            margin: 0,
            letterSpacing: "-0.01em",
            fontWeight: 700,
          }}
        >
          {title}
        </h2>
      </div>
      {sub && (
        <p style={{ margin: "0 0 16px", color: "#6b665e", fontSize: 14 }}>
          {sub}
        </p>
      )}
    </>
  );
}

export default function BookUti() {
  // Dates depend on "today", so compute them in the browser (the page is prerendered at build time).
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const days = useMemo(() => (mounted ? nextDays() : []), [mounted]);
  const [service, setService] = useState<string | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [urgency, setUrgency] = useState("whenever");
  const [addons, setAddons] = useState<Record<string, boolean>>({ fake: true });
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [ticket, setTicket] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const svc = SERVICES.find((s) => s.id === service);
  const urg = URGENCIES.find((u) => u.id === urgency)!;
  const dayObj = day != null ? days[day] : null;
  const dayBlocked = !!dayObj && isFootballDay(dayObj);
  const slots = day != null && !dayBlocked ? slotsFor(day) : [];

  const base = svc ? svc.price : 0;
  const chosenAddons = ADDONS.filter((a) => addons[a.id]);
  const addonTotal = chosenAddons.reduce((n, a) => n + a.price, 0);
  const surge = Math.round((base + addonTotal) * (urg.mult - 1));
  const sub = base + addonTotal + surge;
  const discount = Math.round(sub * 0.1);
  const total = sub - discount;
  const ready = !!svc && day != null && slot != null;

  const sumService = svc ? svc.name : "—";
  const sumWhen =
    ready && dayObj
      ? `${dayObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${TIMES[slot!]}`
      : "—";
  const sumUrgency = `${urg.tag} · ${urg.name}`;

  async function confirm() {
    if (!ready || sending) return;
    const key = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
    if (!key) {
      setError(
        "Booking email isn't set up yet (missing NEXT_PUBLIC_WEB3FORMS_KEY).",
      );
      return;
    }
    const newTicket = "UTI-" + Math.floor(1000 + Math.random() * 9000);
    setSending(true);
    setError("");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: key,
          subject: `New booking ${newTicket}: ${sumService} — ${sumWhen}`,
          from_name: "UtiOnDemand",
          Ticket: newTicket,
          Service: sumService,
          When: sumWhen,
          Priority: sumUrgency,
          "Add-ons": chosenAddons.map((a) => a.name).join(", ") || "None",
          "Special instructions": notes || "None",
          Total: `${total} ${UNITS[1]}`,
          "Expected response": urg.resp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.message || "Send failed");
      setTicket(newTicket);
      setConfirmed(true);
    } catch (e) {
      setError(
        `Couldn't send the booking: ${(e as Error).message}. Please try again.`,
      );
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setConfirmed(false);
    setService(null);
    setDay(null);
    setSlot(null);
    setUrgency("whenever");
    setAddons({ fake: true });
    setNotes("");
    setError("");
  }

  const ctaLabel = sending
    ? "Sending…"
    : !svc
      ? "Select a service"
      : day == null || slot == null
        ? "Pick a time slot"
        : "Confirm booking";
  const ctaOn = ready && !sending;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <header
        style={{ borderBottom: "1px solid #dedad3", background: "#fbfaf8" }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "#1d1b19",
                color: "#fbfaf8",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              U
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "-0.01em",
              }}
            >
              UtiOnDemand
              <span style={{ fontWeight: 400, color: "#8a857d" }}>™</span>
            </div>
            <div
              style={{
                ...MONO,
                fontSize: 11,
                color: "#8a857d",
                border: "1px solid #dedad3",
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              ENTERPRISE
            </div>
          </div>
        </div>
      </header>

      <section
        style={{
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          padding: "48px 20px 28px",
        }}
      >
        <div
          style={{
            ...MONO,
            fontSize: 12,
            color: ACCENT_TEXT,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Boyfriend-as-a-Service · Licensed exclusively to Ashley
        </div>
        <h1
          style={{
            fontSize: "clamp(36px,6vw,64px)",
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            margin: "0 0 16px",
            maxWidth: 820,
            textWrap: "balance",
            fontWeight: 700,
          }}
        >
          Book Uti. For anything.
          <br />
          <span style={{ color: "#8a857d" }}>Within reason.*</span>
        </h1>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            color: "#4a4640",
            maxWidth: 620,
            margin: "0 0 28px",
            textWrap: "pretty",
          }}
        >
          Industry-leading boyfriend availability with a 99.2% uptime SLA.
          Downtime covers naps, ranked matches and staring at the fridge.
        </p>
        <div
          style={{
            ...MONO,
            display: "flex",
            gap: 28,
            flexWrap: "wrap",
            fontSize: 13,
            color: "#4a4640",
          }}
        >
          {[
            ["99.2%", "uptime (self-reported)"],
            ["12 min", "avg. response time"],
            ["1", "client, forever"],
          ].map(([big, small]) => (
            <div key={small}>
              <b
                style={{
                  fontSize: 22,
                  color: "#1d1b19",
                  fontFamily: "var(--font-plex-sans)",
                }}
              >
                {big}
              </b>
              <br />
              {small}
            </div>
          ))}
        </div>
      </section>

      <main
        style={{
          maxWidth: 1180,
          width: "100%",
          margin: "0 auto",
          padding: "0 20px 56px",
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            flex: "1 1 580px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {/* 01 Services */}
          <div style={card}>
            <StepHeader
              n="01"
              title="Select a service"
              sub={`All prices in ${UNITS[1]}. Payable on completion.`}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))",
                gap: 10,
              }}
            >
              {SERVICES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setService(s.id)}
                  style={{
                    textAlign: "left",
                    cursor: "pointer",
                    borderRadius: 10,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    color: "#1d1b19",
                    border: "1.5px solid",
                    ...sel(service === s.id),
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "flex-start",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {s.name}
                    </span>
                    <span
                      style={{
                        ...MONO,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        color: ACCENT_TEXT,
                        fontWeight: 600,
                      }}
                    >
                      {s.price} {UNITS[2]}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: 1.45,
                      color: "#6b665e",
                      textWrap: "pretty",
                    }}
                  >
                    {s.desc}
                  </span>
                  <span
                    style={{
                      ...MONO,
                      fontSize: 11,
                      color: "#8a857d",
                      marginTop: 2,
                    }}
                  >
                    {s.dur}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 02 Date & time */}
          <div style={card}>
            <StepHeader
              n="02"
              title="Pick a date & time"
              sub="Live boyfriend availability. Wednesdays and Saturdays are reserved for football (non-negotiable, legally binding)."
            />
            <div
              style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 6,
                marginBottom: 16,
              }}
            >
              {days.map((d, i) => {
                const on = day === i;
                const football = isFootballDay(d);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setDay(i);
                      setSlot(null);
                    }}
                    style={{
                      flex: "0 0 auto",
                      width: 62,
                      padding: "10px 0",
                      borderRadius: 10,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 2,
                      border: `1.5px solid ${on ? "#1d1b19" : "#dedad3"}`,
                      background: on
                        ? "#1d1b19"
                        : football
                          ? "#f5f3ef"
                          : "#fff",
                      color: on ? "#fff" : football ? "#a39e95" : "#1d1b19",
                    }}
                  >
                    <span
                      style={{
                        ...MONO,
                        fontSize: 11,
                        textTransform: "uppercase",
                      }}
                    >
                      {i === 0
                        ? "Today"
                        : d.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span style={{ fontSize: 20, fontWeight: 600 }}>
                      {d.getDate()}
                    </span>
                    <span style={{ ...MONO, fontSize: 10 }}>
                      {football
                        ? "Football"
                        : d.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
            {dayBlocked && (
              <div
                style={{
                  padding: 14,
                  borderRadius: 10,
                  background: "#f5f3ef",
                  fontSize: 14,
                  color: "#4a4640",
                }}
              >
                Uti is unavailable all day. Reason: <b>Football.</b> Please pick
                another day or submit an escalation to his mom.
              </div>
            )}
            {day != null && !dayBlocked && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))",
                  gap: 8,
                }}
              >
                {slots.map((t, k) => {
                  const on = slot === k;
                  return (
                    <button
                      key={t.time}
                      disabled={!t.ok}
                      onClick={() => t.ok && setSlot(k)}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        borderRadius: 9,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        border: `1.5px solid ${on ? ACCENT : "#dedad3"}`,
                        background: on
                          ? "oklch(0.97 0.02 25)"
                          : t.ok
                            ? "#fff"
                            : "#f5f3ef",
                        color: t.ok ? "#1d1b19" : "#a39e95",
                        cursor: t.ok ? "pointer" : "not-allowed",
                      }}
                    >
                      <span style={{ ...MONO, fontSize: 15, fontWeight: 600 }}>
                        {t.time}
                      </span>
                      <span style={{ fontSize: 12 }}>{t.note}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 03 Priority */}
          <div style={card}>
            <StepHeader
              n="03"
              title="Priority level"
              sub="Helps our team (Uti) triage your request. Surge pricing may apply."
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                gap: 8,
              }}
            >
              {URGENCIES.map((u) => {
                const hot = u.id === "fine" || u.id === "hangry";
                return (
                  <button
                    key={u.id}
                    onClick={() => setUrgency(u.id)}
                    style={{
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "12px 14px",
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      color: "#1d1b19",
                      border: "1.5px solid",
                      ...sel(urgency === u.id),
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        width: "100%",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          ...MONO,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: hot ? ACCENT : "#eeebe6",
                          color: hot ? "#fff" : "#4a4640",
                        }}
                      >
                        {u.tag}
                      </span>
                      <span style={{ ...MONO, fontSize: 12, color: "#8a857d" }}>
                        ×{u.mult}
                      </span>
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>
                      {u.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#6b665e",
                        lineHeight: 1.4,
                      }}
                    >
                      {u.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 04 Add-ons */}
          <div style={card}>
            <StepHeader n="04" title="Add-ons & upgrades" />
            <p style={{ margin: "0 0 12px", color: "#6b665e", fontSize: 14 }}>
              Enhance your experience. Premium features sold separately.
            </p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {ADDONS.map((a) => {
                const on = !!addons[a.id];
                const boxColor = on
                  ? a.locked
                    ? "#a39e95"
                    : ACCENT
                  : undefined;
                return (
                  <button
                    key={a.id}
                    onClick={() =>
                      !a.locked &&
                      setAddons((s) => ({ ...s, [a.id]: !s[a.id] }))
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 2px",
                      border: "none",
                      borderTop: "1px solid #eeebe6",
                      background: "transparent",
                      textAlign: "left",
                      color: "#1d1b19",
                      cursor: a.locked ? "default" : "pointer",
                    }}
                  >
                    <span
                      style={{
                        flex: "0 0 auto",
                        width: 20,
                        height: 20,
                        borderRadius: 5,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#fff",
                        border: `1.5px solid ${boxColor ?? "#cfcac2"}`,
                        background: boxColor ?? "#fff",
                      }}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <span style={{ fontWeight: 500, fontSize: 15 }}>
                        {a.name}
                      </span>
                      <span style={{ fontSize: 12, color: "#8a857d" }}>
                        {a.desc}
                      </span>
                    </span>
                    <span
                      style={{
                        ...MONO,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        color: "#4a4640",
                      }}
                    >
                      {a.price ? `+${a.price} ${UNITS[2]}` : "Included"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 05 Notes */}
          <div style={card}>
            <label
              htmlFor="notes"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <span style={{ ...MONO, fontSize: 12, color: "#8a857d" }}>
                05
              </span>
              <span
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Special instructions
              </span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Do NOT wear the cargo shorts."
              style={{
                width: "100%",
                minHeight: 84,
                resize: "vertical",
                border: "1.5px solid #dedad3",
                borderRadius: 10,
                padding: 12,
                fontFamily: "inherit",
                fontSize: 15,
                color: "#1d1b19",
                background: "#fbfaf8",
                outline: "none",
              }}
            />
            <div
              style={{ ...MONO, fontSize: 11, color: "#8a857d", marginTop: 6 }}
            >
              Instructions will be read. Compliance is best-effort.
            </div>
          </div>
        </div>

        {/* Summary */}
        <aside
          style={{
            flex: "1 1 320px",
            maxWidth: "100%",
            position: "sticky",
            top: 16,
            background: "#1d1b19",
            color: "#f5f3ef",
            borderRadius: 14,
            padding: 22,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 17 }}>
              Booking summary
            </span>
            <span style={{ ...MONO, fontSize: 11, color: "#a39e95" }}>
              Client: Ashley
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 9,
              fontSize: 14,
              borderTop: "1px solid #3a3733",
              paddingTop: 14,
            }}
          >
            {[
              ["Service", sumService],
              ["When", sumWhen],
              ["Priority", sumUrgency],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span style={{ color: "#a39e95" }}>{k}</span>
                <span style={{ textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              ...MONO,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              borderTop: "1px solid #3a3733",
              paddingTop: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Base rate</span>
              <span>{base}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Add-ons</span>
              <span>+{addonTotal}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Priority surcharge</span>
              <span>+{surge}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "oklch(0.78 0.14 150)",
              }}
            >
              <span>Girlfriend discount (−10%)</span>
              <span>−{discount}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#a39e95",
              }}
            >
              <span>Service fee</span>
              <span>1 hug</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderTop: "1px solid #3a3733",
              paddingTop: 14,
            }}
          >
            <span style={{ fontWeight: 600 }}>Total due</span>
            <span
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              {total}{" "}
              <span style={{ fontSize: 14, fontWeight: 500, color: "#a39e95" }}>
                {UNITS[1]}
              </span>
            </span>
          </div>
          <button
            onClick={confirm}
            disabled={!ctaOn}
            style={{
              border: "none",
              borderRadius: 10,
              padding: 15,
              fontSize: 16,
              fontWeight: 600,
              background: ctaOn ? ACCENT : "#3a3733",
              color: ctaOn ? "#fff" : "#8a857d",
              cursor: ctaOn ? "pointer" : "not-allowed",
            }}
          >
            {ctaLabel}
          </button>
          {error && (
            <div
              role="alert"
              style={{ fontSize: 13, lineHeight: 1.45, color: "#ffb4a6" }}
            >
              {error}
            </div>
          )}
          <div
            style={{ ...MONO, fontSize: 11, lineHeight: 1.5, color: "#a39e95" }}
          >
            By confirming you agree to the Terms of Boyfriend Service. Kisses
            are non-refundable and non-transferable.
          </div>
        </aside>
      </main>

      {SHOW_FINE_PRINT && (
        <footer style={{ borderTop: "1px solid #dedad3" }}>
          <div
            style={{
              maxWidth: 1180,
              margin: "0 auto",
              padding: "40px 20px 56px",
            }}
          >
            <h3
              style={{
                ...MONO,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8a857d",
                margin: "0 0 14px",
              }}
            >
              * Cancellation policy &amp; fine print
            </h3>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
                gap: "8px 32px",
                fontSize: 13,
                lineHeight: 1.55,
                color: "#6b665e",
                listStyle: "decimal",
              }}
            >
              <li>
                Client (Ashley) may cancel at any time, for any reason, with
                zero notice. No fee applies.
              </li>
              <li>
                Provider (Uti) may cancel only with 72 hours&apos; notice, a
                written apology, and snacks.
              </li>
              <li>
                &quot;I&apos;m fine.&quot; priority bookings cannot be cancelled
                by the provider under any circumstances.
              </li>
              <li>
                Provider is not liable for choosing the restaurant when client
                said &quot;anywhere is fine.&quot;
              </li>
              <li>
                Back rub duration is measured in client-perceived minutes, not
                actual minutes.
              </li>
              <li>
                &quot;Remembers this conversation later&quot; add-on carries a
                60% success rate and no warranty.
              </li>
              <li>
                Provider reserves the right to fall asleep during movies after
                22:00. Client may poke.
              </li>
              <li>
                All disputes are settled by the client. The client is always
                right. See clause 1.
              </li>
            </ol>
            <div
              style={{ ...MONO, marginTop: 28, fontSize: 11, color: "#a39e95" }}
            >
              © 2026 UtiOnDemand™ Inc. · A wholly-owned subsidiary of Ashley.
            </div>
          </div>
        </footer>
      )}

      {confirmed && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(29,27,25,0.55)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 460,
              width: "100%",
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ background: ACCENT, color: "#fff", padding: 24 }}>
              <div
                style={{ ...MONO, fontSize: 12, opacity: 0.9, marginBottom: 6 }}
              >
                TICKET #{ticket}
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                Booking confirmed.
              </div>
              <div style={{ fontSize: 15, marginTop: 4 }}>
                Uti has been notified and cannot unsee it.
              </div>
            </div>
            <div
              style={{
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                fontSize: 14,
              }}
            >
              {[
                ["Service", sumService],
                ["When", sumWhen],
                ["Expected response", urg.resp],
                ["Amount due", `${total} ${UNITS[1]}`],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ color: "#8a857d" }}>{k}</span>
                  <b style={{ textAlign: "right" }}>{v}</b>
                </div>
              ))}
              <div
                style={{
                  ...MONO,
                  marginTop: 6,
                  padding: "12px 14px",
                  background: "#f5f3ef",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#4a4640",
                }}
              >
                Auto-reply from Uti: &quot;{urg.reply}&quot;
              </div>
              <button
                onClick={reset}
                style={{
                  marginTop: 8,
                  border: "none",
                  borderRadius: 10,
                  padding: 14,
                  fontSize: 15,
                  fontWeight: 600,
                  background: "#1d1b19",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                Book another activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
