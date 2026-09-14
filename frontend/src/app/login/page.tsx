"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, WalletKind } from "@/context/AuthContext";
import Alert from "@/components/ui/Alert";
import { Wordmark } from "@/components/NavBar";
import { GoogleGlyph, SlushGlyph, SpinnerIcon } from "@/components/ui/Icons";

export default function LoginPage() {
  const { loginWithWallet, user, loading } = useAuth();
  const router = useRouter();
  const [connecting, setConnecting] = useState<WalletKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleConnect(kind: WalletKind) {
    setError(null);
    setConnecting(kind);
    try {
      await loginWithWallet(kind);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Please try again.");
    } finally {
      setConnecting(null);
    }
  }

  const busy = connecting !== null;

  return (
    <div className="animate-fade-in mx-auto max-w-sm py-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Wordmark />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-950">Sign in to Attest</h1>
          <p className="mt-1 text-sm text-ink-500">
            No email or password — your wallet is your account. Signing in for the first time
            creates it.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => handleConnect("slush")}
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-sui-600 px-4 text-sm font-medium text-white shadow-sm shadow-sui-600/30 transition-colors hover:bg-sui-700 disabled:opacity-50"
        >
          {connecting === "slush" ? <SpinnerIcon /> : <SlushGlyph />}
          {connecting === "slush" ? "Waiting for Slush…" : "Continue with Slush"}
        </button>
        <button
          onClick={() => handleConnect("google")}
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink-300 bg-white px-4 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 disabled:opacity-50"
        >
          {connecting === "google" ? <SpinnerIcon /> : <GoogleGlyph />}
          {connecting === "google" ? "Waiting for Google…" : "Continue with Google"}
        </button>

        {error && <Alert tone="error">{error}</Alert>}
      </div>

      <Alert tone="info" title="First time signing in?" className="mt-4">
        Your account is created automatically the moment you sign in — there is no separate
        registration step. New accounts start as a Signer, so you can upload and sign right away;
        your role within any specific team is set by that team&apos;s admin when you join.
      </Alert>
    </div>
  );
}
