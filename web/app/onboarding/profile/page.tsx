"use client";
import { useState } from "react";
import { post, type User } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const SPORTS: Record<string, string[]> = {
  football: ["goalkeeper", "centre back", "full back", "defensive midfielder", "central midfielder", "attacking midfielder", "winger", "striker"],
  cricket: ["batter", "bowler", "all rounder", "wicket keeper"],
  basketball: ["point guard", "shooting guard", "small forward", "power forward", "center"],
  athletics: ["sprinter", "hurdler", "middle distance", "long jumper", "thrower"],
};
const REGIONS = ["North", "South", "East", "West", "Central", "North East"];
const LEVELS = ["beginner", "district", "state", "national", "professional"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default function ProfilePage() {
  const { data: me, loading } = useApi<User>("/me");
  if (loading || !me) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  return <ProfileForm me={me} />;
}

function ProfileForm({ me }: { me: User }) {
  const p = me.profile;
  const [mode, setMode] = useState(me.mode);
  const [sport, setSport] = useState(p?.sport ?? "football");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    setBusy(true);
    try {
      await post("/me/profile", {
        ...f,
        mode,
        sport,
        age: f.age ? Number(f.age) : null,
        skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
      }, "PUT");
      location.href = "/";
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <p className="text-sm text-muted">Step 2 of 2</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Set up your profile</h1>
      <p className="mt-2 text-muted">These fields drive your opportunity matches. You can change them later.</p>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-6">
        <div role="radiogroup" aria-label="Profile mode" className="grid grid-cols-2 gap-3">
          {[
            ["professional", "Professional", "Compete, get scouted, see matched opportunities."],
            ["casual", "Casual", "Play for fun, follow people, join local events."],
          ].map(([v, t, d]) => (
            <button
              type="button"
              role="radio"
              aria-checked={mode === v}
              key={v}
              onClick={() => setMode(v)}
              className={`rounded-2xl border p-4 text-left transition ${mode === v ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-faint"}`}
            >
              <span className="block text-sm font-semibold">{t}</span>
              <span className="mt-1 block text-sm text-muted">{d}</span>
            </button>
          ))}
        </div>

        <Field label="Full name"><input name="name" required defaultValue={me.name ?? ""} className="field" /></Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Sport">
            <select className="field" value={sport} onChange={(e) => setSport(e.target.value)}>
              {Object.keys(SPORTS).map((s) => <option key={s} value={s}>{cap(s)}</option>)}
            </select>
          </Field>
          <Field label="Position">
            <select name="position" className="field" defaultValue={p?.position ?? ""} key={sport}>
              {SPORTS[sport].map((s) => <option key={s} value={s}>{cap(s)}</option>)}
            </select>
          </Field>
          <Field label="Age"><input name="age" type="number" min={8} max={60} required defaultValue={p?.age ?? ""} className="field" /></Field>
          <Field label="Level">
            <select name="level" className="field" defaultValue={p?.level ?? "district"}>
              {LEVELS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
            </select>
          </Field>
          <Field label="City"><input name="city" required defaultValue={p?.city ?? ""} className="field" /></Field>
          <Field label="Region">
            <select name="region" className="field" defaultValue={p?.region ?? "North"}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Skills" hint="Comma separated, for example: passing, vision, dribbling">
          <input name="skills" defaultValue={p?.skills.join(", ") ?? ""} className="field" />
        </Field>
        <Field label="Goals" hint="What are you looking for? Trials, a scholarship, a team to join.">
          <textarea name="goals" rows={3} defaultValue={p?.goals ?? ""} className="field" />
        </Field>
        <Field label="Bio"><textarea name="bio" rows={3} defaultValue={p?.bio ?? ""} className="field" /></Field>

        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button className="btn-primary self-start" disabled={busy}>Save profile</button>
      </form>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
