"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, Role, UserResponse } from "@/lib/api";

export default function AdminPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [userId, setUserId] = useState("");
    const [role, setRole] = useState<Role>("SIGNER");
    const [result, setResult] = useState<UserResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && (!user || user.role !== "ADMIN")) {
            router.replace("/documents");
        }
    }, [loading, user, router]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setResult(null);
        setSubmitting(true);
        try {
            const updated = await api.updateUserRole(Number(userId), role);
            setResult(updated);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not update role.");
        } finally {
            setSubmitting(false);
        }
    }

    if (loading || !user || user.role !== "ADMIN") return null;

    return (
        <div className="max-w-sm space-y-4">
            <h1 className="text-xl font-bold">Admin — change a user&apos;s role</h1>
            <p className="text-sm text-gray-600">
                Ask the person for their user id (it&apos;s shown on their Documents page),
                then promote them here. This is the only way a SIGNER or ADMIN account is
                ever created.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label className="block text-sm text-gray-700 mb-1">User ID</label>
                    <input
                        type="number"
                        required
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-700 mb-1">New role</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                        className="w-full border border-gray-300 rounded px-3 py-2"
                    >
                        <option value="VIEWER">VIEWER</option>
                        <option value="SIGNER">SIGNER</option>
                        <option value="ADMIN">ADMIN</option>
                    </select>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                {result && (
                    <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded p-2">
                        {result.email} is now {result.role}.
                    </p>
                )}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-indigo-900 text-white rounded py-2 disabled:opacity-50"
                >
                    {submitting ? "Updating..." : "Update role"}
                </button>
            </form>
        </div>
    );
}