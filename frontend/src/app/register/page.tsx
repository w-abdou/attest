"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
    const { register } = useAuth();
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
            await register(email, password);
            router.push("/documents");
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Something went wrong. Is the backend running?");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="max-w-sm mx-auto space-y-4">
            <h1 className="text-xl font-bold">Register</h1>
            <p className="text-sm text-gray-600">
                New accounts always start as <strong>VIEWER</strong> — this is intentional (a
                registration request can never grant itself elevated permissions). An
                administrator has to promote your account to SIGNER before you can upload
                documents.
            </p>
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
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-900 text-white rounded py-2 disabled:opacity-50"
                >
                    {submitting ? "Creating account..." : "Register"}
                </button>
            </form>
        </div>
    );
}