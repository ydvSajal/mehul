"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, SealCheck } from "@phosphor-icons/react";
import { AppShell } from "@/components/app-shell";
import { MatchCard } from "@/components/match-card";
import { post, type Match, type Person, type Post, type User } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const initials = (n: string | null) => (n ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000); // API returns tz-aware ISO
  return m < 1 ? "now" : m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
};

function Avatar({ name, size = "size-10" }: { name: string | null; size?: string }) {
  return <span className={`${size} grid shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent`}>{initials(name)}</span>;
}

export default function FeedPage() {
  const me = useApi<User>("/me");
  const posts = useApi<Post[]>("/posts");
  const matches = useApi<Match[]>("/opportunities/recommended?k=3");
  const people = useApi<Person[]>("/people/suggested");

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr_300px]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {me.data ? <ProfileCard me={me.data} /> : <div className="panel h-48 animate-pulse" />}
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <Composer onPosted={posts.reload} />
          <h2 className="text-lg font-semibold tracking-tight">For you</h2>
          {posts.loading && <div className="panel h-28 animate-pulse" />}
          {posts.error && <p className="text-sm text-red-600 dark:text-red-400">{posts.error}</p>}
          {posts.data?.length === 0 && (
            <p className="panel p-6 text-sm text-muted">No posts yet. Share a training update or a result to start the feed.</p>
          )}
          <div className="flex flex-col divide-y divide-line">
            {posts.data?.map((p) => (
              <article key={p.id} className="flex gap-3 py-5 first:pt-0">
                <Avatar name={p.author.name} />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{p.author.name}</span>{" "}
                    <span className="capitalize text-muted">{p.author.role} &middot; {ago(p.created_at)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">{p.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="flex flex-col gap-8">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight">Upcoming opportunities</h2>
              <Link href="/opportunities" className="flex items-center gap-1 text-sm text-accent">All <ArrowRight size={14} /></Link>
            </div>
            <div className="mt-2 divide-y divide-line">
              {matches.loading && <div className="h-40 animate-pulse rounded-2xl bg-surface" />}
              {matches.data?.length === 0 && <p className="py-3 text-sm text-muted">Complete your profile to see matches.</p>}
              {matches.data?.map((m) => <MatchCard key={m.opportunity.id} match={m} compact />)}
            </div>
          </div>
          <div>
            <h2 className="font-semibold tracking-tight">People you may know</h2>
            <div className="mt-3 flex flex-col gap-3">
              {people.data?.length === 0 && <p className="text-sm text-muted">As more athletes in your sport join, they show up here.</p>}
              {people.data?.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar name={p.name} size="size-9" />
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="truncate text-muted">{[p.position, p.city].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function ProfileCard({ me }: { me: User }) {
  const p = me.profile;
  return (
    <div className="panel p-5">
      <Avatar name={me.name} size="size-14" />
      <p className="mt-3 flex items-center gap-1.5 font-semibold">
        {me.name}
        {me.verification_status === "verified" && <SealCheck size={18} weight="fill" className="text-accent" aria-label="Verified" />}
      </p>
      <p className="text-sm text-muted">{p ? [p.position, p.city].filter(Boolean).join(", ") : "Profile incomplete"}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div><dt className="text-muted">Mode</dt><dd className="font-medium capitalize">{me.mode}</dd></div>
        <div><dt className="text-muted">Level</dt><dd className="font-medium capitalize">{p?.level ?? "-"}</dd></div>
        <div className="col-span-2"><dt className="text-muted">ID check</dt><dd className="font-medium capitalize">{me.verification_status}</dd></div>
      </dl>
      <Link href="/onboarding/profile" className="btn-ghost mt-5 w-full">Edit profile</Link>
    </div>
  );
}

function Composer({ onPosted }: { onPosted: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="panel flex flex-col gap-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await post("/posts", { body });
          setBody("");
          onPosted();
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="composer" className="sr-only">New post</label>
      <textarea
        id="composer" rows={2} value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000}
        placeholder="Share a result, a highlight or what you are training for"
        className="w-full resize-none bg-transparent text-ink outline-none placeholder:text-faint"
      />
      <button className="btn-primary self-end" disabled={busy || !body.trim()}>Post</button>
    </form>
  );
}
