"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LinkButton } from "@/components/ui/Button";
import {
  CheckCircleIcon, HistoryIcon, LayersIcon, PenIcon, ShieldIcon, UsersIcon,
} from "@/components/ui/Icons";

const FEATURES = [
  {
    icon: <ShieldIcon />,
    title: "SHA-256 integrity",
    body: "Every upload is fingerprinted on the server. Re-upload a file later and Attest tells you whether a single byte moved.",
  },
  {
    icon: <LayersIcon />,
    title: "Immutable versions",
    body: "Amending a document never overwrites it. Each version is a new record with its own hash and its own signature set.",
  },
  {
    icon: <UsersIcon />,
    title: "Team-scoped access",
    body: "Documents belong to a team, not a person. Roles are resolved live on every request, so revoking access takes effect immediately.",
  },
  {
    icon: <PenIcon />,
    title: "Explicit signer sets",
    body: "The uploader or a team admin names exactly who must sign. Being in the team is never enough on its own.",
  },
  {
    icon: <HistoryIcon />,
    title: "Server-written audit trail",
    body: "Uploads, amendments, verifications and signatures are all recorded by the backend and cannot be edited by a client.",
  },
  {
    icon: <CheckCircleIcon />,
    title: "Fails loudly",
    body: "A modified document does not quietly pass. Verification against the stored digest returns an unambiguous failure.",
  },
];

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) return null;

  return (
    <div className="animate-fade-in -mx-4 -mt-8 sm:-mx-6">
      {/* Hero */}
      <section className="hero-grid border-b border-ink-200 px-4 pb-16 pt-16 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sui-200 bg-white/80 px-3 py-1 text-xs font-medium text-sui-700 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-sui-400" aria-hidden="true" />
            Sui-backed cryptographic signing arrives in milestone 2
          </span>

          <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-sui-950 sm:text-5xl">
            Prove a document has not changed since it was signed.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-ink-600">
            Attest fingerprints every document, keeps every version immutable, and records
            who signed which exact bytes — so &ldquo;this is the version we agreed on&rdquo;
            stops being a matter of trust.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <LinkButton href="/register" size="lg">Create an account</LinkButton>
            <LinkButton href="/login" size="lg" variant="secondary">Log in</LinkButton>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-px overflow-hidden rounded-xl bg-ink-200 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white p-6">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-sui-50 text-lg text-sui-600">
                  {feature.icon}
                </span>
                <h2 className="mt-3.5 text-sm font-semibold text-ink-900">{feature.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-ink-200 bg-ink-50/60 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-lg font-semibold tracking-tight text-ink-950">
            How a document moves through Attest
          </h2>
          <ol className="mt-8 space-y-5">
            {[
              ["Create a team", "You become its first team admin and decide who joins and at what role."],
              ["Upload a document", "The backend hashes the file and stores version 1 as an immutable record."],
              ["Assign required signers", "Pick the exact team members whose signature this version needs."],
              ["Collect signatures", "Once every assigned signer has signed, the version becomes fully signed."],
              ["Verify any time", "Re-upload the file to check it byte-for-byte against the stored digest."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sui-600 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-medium text-ink-900">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
