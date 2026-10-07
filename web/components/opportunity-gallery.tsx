"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence, MotionConfig, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform,
} from "motion/react";
import { CalendarBlank, Lightning, MapPin, Target, UsersThree, X } from "@phosphor-icons/react";
import type { Match, Opportunity } from "@/lib/api";
import { ScoreRing } from "./match-card";

const SPRING = { type: "spring", stiffness: 260, damping: 32 } as const;
const TYPES = ["all", "trial", "scholarship", "tournament", "camp"] as const;
const LABELS: Record<string, string> = { position: "Position", skills: "Skills", age: "Age", location: "Location", experience: "Level", goals: "Goals" };

// ponytail: picsum placeholder, seeded per opportunity. Swap for org-uploaded or generated sport imagery (S3) later.
const img = (o: Opportunity, w = 900, h = 1100) => `https://picsum.photos/seed/gu-${o.id}/${w}/${h}?grayscale`;
// Deterministic on-palette gradient per opportunity: shows while the photo loads and if it fails.
const tone = (o: Opportunity) => {
  const h = [...o.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7);
  const hue = 150 + (Math.abs(h) % 50); // green to teal
  return `linear-gradient(140deg, hsl(${hue} 55% 22%), hsl(${hue + 25} 45% 9%))`;
};
const hideBroken = (e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null);

export function OpportunityGallery({ matches }: { matches: Match[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [type, setType] = useState<(typeof TYPES)[number]>("all");
  const [sort, setSort] = useState<"score" | "deadline">("score");

  const shown = useMemo(() => {
    const list = matches.filter((m) => type === "all" || m.opportunity.type === type);
    if (sort === "deadline") {
      return [...list].sort((a, b) => (a.opportunity.deadline ?? "9").localeCompare(b.opportunity.deadline ?? "9"));
    }
    return list;
  }, [matches, type, sort]);
  const open = matches.find((m) => m.opportunity.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  return (
    <MotionConfig reducedMotion="user" transition={SPRING}>
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Opportunity type" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
          {TYPES.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              onClick={() => setType(t)}
              className={`relative rounded-lg px-3 py-1.5 text-sm transition-colors ${type === t ? "text-accent-ink" : "text-muted hover:text-ink"}`}
            >
              {type === t && <motion.span layoutId="type-pill" className="absolute inset-0 rounded-lg bg-accent" />}
              <span className="relative">{t === "all" ? "All" : cap(t)}</span>
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as "score" | "deadline")} className="field w-auto">
            <option value="score">Best match</option>
            <option value="deadline">Deadline soonest</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm text-muted">{shown.length} {shown.length === 1 ? "opportunity" : "opportunities"}</p>

      <motion.div layout className="mt-4 grid auto-rows-[420px] grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {shown.map((m, i) => {
            const id = m.opportunity.id;
            const featured = i === 0 && sort === "score";
            return (
              <motion.div
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className={featured ? "sm:col-span-2" : ""}
              >
                {openId === id ? (
                  <div className="h-full rounded-3xl border border-dashed border-line" aria-hidden />
                ) : (
                  <TiltCard match={m} featured={featured} onOpen={() => setOpenId(id)} />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {shown.length === 0 && (
        <p className="panel mt-4 p-8 text-center text-sm text-muted">No {type} opportunities match your profile right now.</p>
      )}

      <AnimatePresence>{open && <Expanded key={open.opportunity.id} match={open} onClose={() => setOpenId(null)} />}</AnimatePresence>
    </MotionConfig>
  );
}

function TiltCard({ match, featured, onOpen }: { match: Match; featured: boolean; onOpen: () => void }) {
  const o = match.opportunity;
  const reduce = useReducedMotion();
  // Pointer position as motion values: no React re-render per mouse move.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-9, 9]);
  const rotateX = useTransform(sy, [0, 1], [9, -9]);
  const gx = useTransform(sx, [0, 1], ["0%", "100%"]);
  const gy = useTransform(sy, [0, 1], ["0%", "100%"]);
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.25), transparent 50%)`;

  function move(e: React.PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse") return; // tilt is a mouse affordance; touch just taps
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }
  function reset() {
    px.set(0.5);
    py.set(0.5);
  }

  const [headline, ...reasons] = match.reasons;
  return (
    <div className="h-full" style={{ perspective: 1100 }}>
      <motion.button
        layoutId={`card-${o.id}`}
        onClick={onOpen}
        onPointerMove={move}
        onPointerLeave={reset}
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        style={{ rotateX, rotateY, borderRadius: 24, background: tone(o) }}
        className="group relative block h-full w-full overflow-hidden text-left shadow-[0_20px_50px_-20px_rgba(4,120,87,0.35)] outline-none focus-visible:ring-4 focus-visible:ring-accent/40"
        aria-label={`${o.title}, match score ${Math.round(match.score)}. Open details`}
      >
        <motion.img layoutId={`img-${o.id}`} src={img(o)} alt="" onError={hideBroken} className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-emerald-950/10" />
        <motion.div aria-hidden style={{ background: glare }} className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute inset-x-3 bottom-3 rounded-2xl glass p-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={match.score} size={featured ? 60 : 52} track="stroke-white/20" />
            <div className="min-w-0">
              <motion.h3 layoutId={`title-${o.id}`} className={`line-clamp-2 font-semibold leading-snug tracking-tight ${featured ? "text-xl" : "text-base"}`}>
                {o.title}
              </motion.h3>
              <p className="truncate text-sm text-white/70">{o.org}</p>
            </div>
          </div>
          <p className="mt-3 line-clamp-2 text-sm text-white/80">
            <span className="font-medium text-emerald-300">{headline}.</span> {reasons.slice(0, featured ? 4 : 2).join(". ")}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/65">
            <span className="flex items-center gap-1"><MapPin size={13} />{o.city ?? "Open / online"}</span>
            {o.deadline && <span className="flex items-center gap-1"><CalendarBlank size={13} />{date(o.deadline)}</span>}
            <span>{cap(o.type)}</span>
          </div>
        </div>
      </motion.button>
    </div>
  );
}

function Expanded({ match, onClose }: { match: Match; onClose: () => void }) {
  const o = match.opportunity;
  const [headline, ...reasons] = match.reasons;
  const reveal = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0, transition: { ...SPRING, delay: 0.12 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-8">
      <motion.div
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="absolute inset-0 cursor-zoom-out bg-zinc-950/70 backdrop-blur-md"
      />
      <motion.div
        layoutId={`card-${o.id}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`t-${o.id}`}
        style={{ borderRadius: 28 }}
        className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden bg-zinc-950 text-white shadow-2xl shadow-black/50"
      >
        <div className="relative h-52 shrink-0 sm:h-64" style={{ background: tone(o) }}>
          <motion.img layoutId={`img-${o.id}`} src={img(o)} alt="" onError={hideBroken} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
          <motion.button
            {...reveal}
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="glass absolute right-4 top-4 grid size-10 place-items-center rounded-full hover:bg-white/20"
          >
            <X size={18} />
          </motion.button>
          <div className="absolute inset-x-0 bottom-0 flex items-end gap-5 p-6">
            <ScoreRing score={match.score} size={76} track="stroke-white/20" />
            <div className="min-w-0">
              <motion.h2 id={`t-${o.id}`} layoutId={`title-${o.id}`} className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {o.title}
              </motion.h2>
              <motion.p {...reveal} className="mt-1 text-white/70">{o.org}</motion.p>
            </div>
          </div>
        </div>

        <motion.div {...reveal} className="relative overflow-y-auto">
          {/* Soft accent glows behind the panels so the frosted glass has something to refract. */}
          <div aria-hidden className="pointer-events-none absolute -left-10 top-10 size-64 rounded-full bg-emerald-500/30 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -right-10 top-72 size-72 rounded-full bg-teal-400/25 blur-3xl" />
          <div className="relative grid gap-5 p-6 pt-2">
            <section className="glass rounded-2xl p-5">
              <h3 className="flex items-center gap-2 text-sm font-medium text-emerald-300"><Target size={16} /> {headline}</h3>
              <ul className="mt-3 grid gap-2 text-sm text-white/85 sm:grid-cols-2">
                {reasons.map((r) => <li key={r} className="flex gap-2"><Lightning size={14} className="mt-0.5 shrink-0 text-emerald-300" />{r}</li>)}
              </ul>
            </section>

            <section aria-label="Score breakdown" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {Object.entries(match.components).map(([k, v]) => (
                <div key={k} className="glass rounded-2xl p-3 text-center">
                  <p className="font-mono text-xl font-semibold">{Math.round(v * 100)}</p>
                  <p className="text-xs text-white/60">{LABELS[k] ?? k}</p>
                </div>
              ))}
            </section>

            <section className="glass grid gap-4 rounded-2xl p-5 text-sm sm:grid-cols-2">
              <Detail icon={<MapPin size={16} />} label="Location" value={o.city ?? "Open / online"} />
              <Detail icon={<CalendarBlank size={16} />} label="Apply by" value={date(o.deadline) ?? "Rolling"} />
              <Detail icon={<UsersThree size={16} />} label="Ages" value={o.age_min != null ? `${o.age_min} to ${o.age_max}` : "Any"} />
              <Detail icon={<Target size={16} />} label="Level" value={o.level ? cap(o.level) : "Any"} />
              <div className="sm:col-span-2">
                <p className="text-white/60">Looking for</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(o.positions.length ? o.positions : ["All positions"]).map((p) => (
                    <span key={p} className="rounded-lg bg-emerald-400/15 px-2.5 py-1 text-emerald-200">{cap(p)}</span>
                  ))}
                  {o.skills.map((s) => <span key={s} className="rounded-lg bg-white/10 px-2.5 py-1">{cap(s)}</span>)}
                </div>
              </div>
            </section>

            {o.description && <p className="max-w-[65ch] leading-relaxed text-white/80">{o.description}</p>}

          </div>
        </motion.div>

        <motion.footer {...reveal} className="flex shrink-0 flex-wrap items-center gap-3 border-t border-white/10 bg-zinc-950/80 px-6 py-4 backdrop-blur">
          <button disabled className="btn-primary" title="Applications open in the next release">Apply (coming soon)</button>
          <button onClick={onClose} className="glass inline-flex h-10 items-center rounded-lg px-4 text-sm transition hover:bg-white/20 active:scale-[0.98]">Back to list</button>
          {o.synthetic && <span className="ml-auto text-xs text-white/50">Synthetic sample opportunity</span>}
        </motion.footer>
      </motion.div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-emerald-300">{icon}</span>
      <div>
        <p className="text-white/60">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
