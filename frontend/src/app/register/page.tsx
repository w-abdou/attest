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

const MIN_PASSWORD = 8;

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password);
      router.replace("/dashboard");
    } catch (err) {
      // Registration then login is two calls against a 5/min/IP budget.
      if (err instanceof ApiError && err.status === 429) {
        setError("Too many attempts. The server allows 5 auth requests a minute — wait about a minute and try again.");
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
          <h1 className="text-xl font-semibold tracking-tight text-ink-950">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">It takes a moment — no invite needed.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
        <Input
          label="Email" type="email" required autoComplete="email" autoFocus
          placeholder="you@company.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          label="Password" required minLength={MIN_PASSWORD} autoComplete="new-password"
          placeholder="At least 8 characters"
          hint={`Use at least ${MIN_PASSWORD} characters.`}
          error={tooShort ? `Passwords must be at least ${MIN_PASSWORD} characters.` : null}
          value={password} onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" fullWidth loading={submitting} disabled={tooShort}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <Alert tone="info" title="New accounts start as Viewer" className="mt-4">
        A registration request can never grant itself elevated permissions, so every new
        account is a Viewer at the system level. Your team role — which is what actually
        governs uploading and signing — is set separately by a team admin when you join a team.
      </Alert>

      <p className="mt-4 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-sui-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
