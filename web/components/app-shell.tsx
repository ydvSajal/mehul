"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { setToken } from "@/lib/api";

const NAV = [
  { href: "/", label: "Feed" },
  { href: "/opportunities", label: "Opportunities" },
];

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-accent-ink text-xs font-bold">
        GU
      </span>
      Ground Up
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8">
          <Link href="/"><Logo /></Link>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${path === n.href ? "bg-surface text-ink border border-line" : "text-muted hover:text-ink"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <button
            className="ml-auto flex items-center gap-1.5 text-sm text-muted hover:text-ink"
            onClick={() => { setToken(null); location.href = "/login"; }}
          >
            <SignOut size={16} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
