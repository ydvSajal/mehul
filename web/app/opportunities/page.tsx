"use client";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { OpportunityGallery } from "@/components/opportunity-gallery";
import type { Match } from "@/lib/api";
import { useApi } from "@/lib/use-api";

export default function OpportunitiesPage() {
  const { data, loading, error, reload } = useApi<Match[]>("/opportunities/recommended?k=24");
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold tracking-tight">Opportunities for you</h1>
      <p className="mt-2 max-w-[65ch] text-muted">
        Ranked by how well your profile matches each opportunity&apos;s requirements: position, skills, age, location, level and goals.
        The score measures fit, not talent. Select a card for the full breakdown.
      </p>

      <div className="mt-8">
        {loading && (
          <div className="grid auto-rows-[420px] gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="animate-pulse rounded-3xl bg-surface" />)}
          </div>
        )}
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
        {!!data?.length && <OpportunityGallery matches={data} />}
      </div>
    </AppShell>
  );
}
