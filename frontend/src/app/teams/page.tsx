"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, TeamResponse } from "@/lib/api";

export default function TeamsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [teams, setTeams] = useState<TeamResponse[]>([]);
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

    async function load() {
        setFetching(true); setError(null);
        try { setTeams(await api.listTeams()); }
        catch (err) { setError(err instanceof ApiError ? err.message : "Could not load teams."); }
        finally { setFetching(false); }
    }
    useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;
        setError(null);
        try { await api.createTeam(name.trim()); setName(""); await load(); }
        catch (err) { setError(err instanceof ApiError ? err.message : "Could not create team."); }
    }

    if (loading || !user) return null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold mb-1">Your teams</h1>
                <p className="text-sm text-gray-600">You are user id {user.id}.</p>
            </div>

            <form onSubmit={handleCreate} className="border border-gray-200 rounded p-4 space-y-3">
                <h2 className="font-semibold">Create a team</h2>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name"
                       className="w-full border border-gray-300 rounded px-3 py-2" />
                <button type="submit" className="px-4 py-2 bg-indigo-900 text-white rounded">Create</button>
                <p className="text-xs text-gray-500">You become this team&apos;s first admin.</p>
            </form>

            {error && <p className="text-red-600 text-sm">{error}</p>}
            {fetching && <p className="text-gray-500 text-sm">Loading...</p>}

            <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                {teams.map((t) => (
                    <li key={t.id} className="p-3 flex items-center justify-between">
                        <Link href={`/teams/${t.id}`} className="font-medium text-indigo-900 hover:underline">{t.name}</Link>
                        <span className="text-xs text-gray-500">{t.yourRole}</span>
                    </li>
                ))}
                {!fetching && teams.length === 0 && <li className="p-3 text-gray-500 text-sm">No teams yet.</li>}
            </ul>
        </div>
    );
}