"use client";
import { useState } from "react";
import { IdentificationCard, ShieldCheck } from "@phosphor-icons/react";
import { post } from "@/lib/api";

const DOCS = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "passport", label: "Passport" },
  { value: "driving_licence", label: "Driving licence" },
  { value: "other", label: "Other government ID" },
];

export default function VerifyPage() {
  const [doc, setDoc] = useState("aadhaar");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    try {
      await post("/me/verification", { doc_type: doc });
      location.href = "/onboarding/profile";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <p className="text-sm text-muted">Step 1 of 2</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Verify your identity</h1>
      <p className="mt-2 max-w-[60ch] text-muted">
        Verified profiles keep the network genuine for scouts and teams. We store the document type and status only, never your ID number.
      </p>

      <fieldset className="mt-8 grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">ID document</legend>
        {DOCS.map((d) => (
          <label
            key={d.value}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${doc === d.value ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-faint"}`}
          >
            <input type="radio" name="doc" value={d.value} checked={doc === d.value} onChange={() => setDoc(d.value)} className="sr-only" />
            <IdentificationCard size={22} className={doc === d.value ? "text-accent" : "text-muted"} />
            <span className="text-sm font-medium">{d.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-accent" />
        Document upload and automatic checks arrive with our KYC partner. For now your request is marked pending review.
      </div>

      {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mt-8 flex gap-3">
        <button className="btn-primary" onClick={submit} disabled={busy}>Submit for review</button>
        <a href="/onboarding/profile" className="btn-ghost">Skip for now</a>
      </div>
    </>
  );
}
