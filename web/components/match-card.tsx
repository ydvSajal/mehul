import { CalendarBlank, MapPin } from "@phosphor-icons/react";
import type { Match } from "@/lib/api";

export function ScoreRing({ score, size = 56, track = "stroke-line" }: { score: number; size?: number; track?: string }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-label={`Match score ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} className={track} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={4} strokeLinecap="round"
          className="stroke-accent" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-sm font-semibold">{Math.round(score)}</span>
    </div>
  );
}

const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null);

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const o = match.opportunity;
  const [headline, ...reasons] = match.reasons;
  return (
    <article className={compact ? "flex gap-3 py-3" : "panel flex gap-5 p-5"}>
      <ScoreRing score={match.score} size={compact ? 44 : 56} />
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium">{o.title}</h3>
        <p className="text-sm text-muted">{o.org}</p>
        {!compact && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1"><MapPin size={14} />{o.city ?? "Open / online"}</span>
            {o.deadline && <span className="flex items-center gap-1"><CalendarBlank size={14} />Apply by {date(o.deadline)}</span>}
            {o.age_min != null && <span>Ages {o.age_min} to {o.age_max}</span>}
          </div>
        )}
        <p className="mt-2 text-sm">
          <span className="font-medium text-accent">{headline}.</span>{" "}
          <span className="text-muted">{reasons.slice(0, compact ? 2 : 5).join(". ")}{reasons.length ? "." : ""}</span>
        </p>
      </div>
    </article>
  );
}
