"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        try {
            await login(email, password);
            router.push("/documents");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Is the backend running?");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-sm mx-auto space-y-4">
            <h1 className="text-xl font-bold">Log in</h1>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-900 text-white rounded py-2 disabled:opacity-50"
                >
                    {submitting ? "Logging in..." : "Log in"}
                </button>
            </form>
        </div>
    );
}