"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Input, PasswordInput } from "@/components/ui/Field";
import Alert from "@/components/ui/Alert";
import { Wordmark } from "@/components/NavBar";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      // The backend rate-limits auth endpoints to 5/min/IP, so call that out
      // rather than leaving the user guessing at a 429.
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many attempts. The server allows 5 sign-in attempts a minute — wait about a minute and try again.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Could not reach the server. Is the backend running on port 8080?");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-sm py-8">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Wordmark />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-950">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in to your Attest account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
        <Input
          label="Email" type="email" required autoComplete="email" autoFocus
          placeholder="you@company.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          label="Password" required autoComplete="current-password"
          placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" fullWidth loading={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-ink-500">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-sui-700 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
