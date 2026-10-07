"use client";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { MatchCard } from "@/components/match-card";
import type { Match } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function OpportunitiesPage() {
  const { data, loading, error, reload } = useApi<Match[]>("/opportunities/recommended?k=20");
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Opportunities for you</h1>
        <p className="mt-2 max-w-[65ch] text-muted">
          Ranked by how well your profile matches each opportunity&apos;s requirements: position, skills, age, location, level and goals.
          The score measures fit, not talent.
        </p>

        <div className="mt-8 flex flex-col gap-4">
          {loading && [0, 1, 2].map((i) => <div key={i} className="panel h-32 animate-pulse" />)}
          {error && (
            <div className="panel flex items-center justify-between p-5 text-sm">
              <span className="text-red-600 dark:text-red-400">{error}</span>
              <button className="btn-ghost" onClick={reload}>Retry</button>
            </div>
          )}
          {data?.length === 0 && (
            <div className="panel p-8 text-center">
              <p className="font-medium">No matches yet</p>
              <p className="mt-1 text-sm text-muted">Add your sport, position, age and skills so we can rank opportunities.</p>
              <Link href="/onboarding/profile" className="btn-primary mt-4">Complete profile</Link>
            </div>
          )}
          {data?.map((m) => <MatchCard key={m.opportunity.id} match={m} />)}
        </div>
        {data?.some((m) => m.opportunity.synthetic) && (
          <p className="mt-6 text-xs text-faint">Prototype: these opportunities are synthetic sample data.</p>
        )}
      </div>
    </AppShell>
  );
}
