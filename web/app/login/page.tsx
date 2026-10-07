"use client";
import Script from "next/script";
import { useState } from "react";
import { DeviceMobile } from "@phosphor-icons/react";
import { post, setToken, type User } from "@/lib/api";
import { Logo } from "@/components/app-shell";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const DEV = process.env.NODE_ENV !== "production";

type Session = { token: string; user: User };

function next(user: User) {
  if (user.verification_status === "unverified") return "/onboarding/verify";
  if (!user.profile?.sport) return "/onboarding/profile";
  return "/";
}

declare global {
  interface Window {
    google?: { accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } } };
  }
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finish(p: Promise<Session>) {
    setBusy(true);
    setError(null);
    try {
      const s = await p;
      setToken(s.token);
      location.href = next(s.user);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  function initGoogle() {
    const el = document.getElementById("google-btn");
    if (!window.google || !el || !GOOGLE_CLIENT_ID) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r: { credential: string }) => finish(post<Session>("/auth/google", { credential: r.credential })),
    });
    window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 320, text: "continue_with" });
  }

  return (
    <div className="grid min-h-[100dvh] md:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden md:block">
        {/* TODO: replace placeholder with real athlete photography (1200x1600) in /public */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://picsum.photos/seed/groundup-athlete-track/1200/1600?grayscale"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <p className="absolute bottom-10 left-10 right-10 max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
          Trials, scholarships and tournaments that actually fit you.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="mt-10 text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-muted">Build your profile once. We rank opportunities for you and tell you why.</p>

          <div className="mt-8 flex flex-col gap-3">
            {GOOGLE_CLIENT_ID ? (
              <>
                <Script src="https://accounts.google.com/gsi/client" onReady={initGoogle} />
                <div id="google-btn" className="min-h-10" />
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
                Google sign-in needs NEXT_PUBLIC_GOOGLE_CLIENT_ID.
              </p>
            )}
            <button className="btn-ghost w-full" disabled title="Coming soon">
              <DeviceMobile size={18} /> Phone number (coming soon)
            </button>
          </div>

          {DEV && (
            <form
              className="mt-8 flex flex-col gap-2 border-t border-line pt-6"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                finish(post<Session>("/auth/dev", { email: f.get("email"), name: f.get("name") }));
              }}
            >
              <label htmlFor="email" className="text-sm font-medium">Dev sign-in (local only)</label>
              <input id="email" name="email" type="email" required defaultValue="arjun.rawat@example.com" className="field" />
              <input name="name" aria-label="Name" defaultValue="Arjun Rawat" className="field" />
              <button className="btn-primary" disabled={busy}>Continue</button>
            </form>
          )}

          {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
      </section>
    </div>
  );
}
