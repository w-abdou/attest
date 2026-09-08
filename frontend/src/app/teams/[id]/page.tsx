"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, DocumentResponse, TeamMemberResponse, TeamRole, TeamResponse } from "@/lib/api";

export default function TeamDetailPage() {
    const params = useParams<{ id: string }>();
    const teamId = Number(params.id);
    const { user, loading } = useAuth();
    const router = useRouter();

    const [team, setTeam] = useState<TeamResponse | null>(null);
    const [members, setMembers] = useState<TeamMemberResponse[]>([]);
    const [documents, setDocuments] = useState<DocumentResponse[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [newEmail, setNewEmail] = useState("");
    const [newRole, setNewRole] = useState<TeamRole>("TEAM_SIGNER");
    const [memberError, setMemberError] = useState<string | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const myRole = team?.yourRole;
    const isTeamAdmin = myRole === "TEAM_ADMIN";
    const canUpload = myRole === "TEAM_ADMIN" || myRole === "TEAM_SIGNER";

    useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

    const load = useCallback(async () => {
        setError(null);
        try {
            const teams = await api.listTeams();
            const t = teams.find((x) => x.id === teamId) ?? null;
            setTeam(t);
            if (!t) { setError("You are not a member of this team."); return; }
            const [m, d] = await Promise.all([api.listMembers(teamId), api.listTeamDocuments(teamId)]);
            setMembers(m); setDocuments(d);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not load this team.");
        }
    }, [teamId]);

    useEffect(() => { if (user && !Number.isNaN(teamId)) load(); }, [user, teamId, load]);

    async function handleAddMember(e: React.FormEvent) {
        e.preventDefault();
        setMemberError(null);
        try { await api.addMember(teamId, newEmail.trim(), newRole); setNewEmail(""); await load(); }
        catch (err) { setMemberError(err instanceof ApiError ? err.message : "Could not add member."); }
    }
    async function handleRoleChange(userId: number, role: TeamRole) {
        setMemberError(null);
        try { await api.updateMemberRole(teamId, userId, role); await load(); }
        catch (err) { setMemberError(err instanceof ApiError ? err.message : "Could not change role."); }
    }
    async function handleRemove(userId: number) {
        setMemberError(null);
        try { await api.removeMember(teamId, userId); await load(); }
        catch (err) { setMemberError(err instanceof ApiError ? err.message : "Could not remove member."); }
    }
    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;
        setUploadError(null);
        try {
            await api.uploadToTeam(teamId, file);
            setFile(null);
            (document.getElementById("team-file-input") as HTMLInputElement).value = "";
            await load();
        } catch (err) { setUploadError(err instanceof ApiError ? err.message : "Upload failed."); }
    }

    if (loading || !user) return null;
    if (error) return <p className="text-red-600">{error}</p>;
    if (!team) return <p className="text-gray-500">Loading...</p>;

    return (
        <div className="space-y-8">
            <div>
                <Link href="/teams" className="text-sm text-indigo-900 hover:underline">← All teams</Link>
                <h1 className="text-xl font-bold mt-1">{team.name}</h1>
                <p className="text-sm text-gray-600">Your role here: {team.yourRole}</p>
            </div>

            {/* Members */}
            <div className="border border-gray-200 rounded p-4 space-y-3">
                <h2 className="font-semibold">Members</h2>
                <ul className="divide-y divide-gray-200">
                    {members.map((m) => (
                        <li key={m.userId} className="py-2 flex items-center justify-between gap-2">
                            <span className="text-sm">{m.email} <span className="text-gray-400">(id {m.userId})</span></span>
                            <div className="flex items-center gap-2">
                                {isTeamAdmin ? (
                                    <>
                                        <select value={m.teamRole} onChange={(e) => handleRoleChange(m.userId, e.target.value as TeamRole)}
                                                className="border border-gray-300 rounded px-2 py-1 text-xs">
                                            <option value="TEAM_VIEWER">TEAM_VIEWER</option>
                                            <option value="TEAM_SIGNER">TEAM_SIGNER</option>
                                            <option value="TEAM_ADMIN">TEAM_ADMIN</option>
                                        </select>
                                        <button onClick={() => handleRemove(m.userId)} className="text-xs text-red-600 hover:underline">Remove</button>
                                    </>
                                ) : (
                                    <span className="text-xs text-gray-500">{m.teamRole}</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                {isTeamAdmin && (
                    <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-2 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-xs text-gray-600 mb-1">Add existing user by email</label>
                            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" placeholder="person@example.com"
                                   className="border border-gray-300 rounded px-2 py-1 text-sm" />
                        </div>
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value as TeamRole)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm">
                            <option value="TEAM_VIEWER">TEAM_VIEWER</option>
                            <option value="TEAM_SIGNER">TEAM_SIGNER</option>
                            <option value="TEAM_ADMIN">TEAM_ADMIN</option>
                        </select>
                        <button type="submit" className="px-3 py-1 bg-indigo-900 text-white rounded text-sm">Add</button>
                    </form>
                )}
                {memberError && <p className="text-red-600 text-sm">{memberError}</p>}
            </div>

            {/* Upload */}
            {canUpload && (
                <form onSubmit={handleUpload} className="border border-gray-200 rounded p-4 space-y-3">
                    <h2 className="font-semibold">Upload a PDF to this team</h2>
                    <input id="team-file-input" type="file" accept="application/pdf"
                           onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                    {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}
                    <button type="submit" disabled={!file} className="px-4 py-2 bg-indigo-900 text-white rounded disabled:opacity-50">Upload</button>
                </form>
            )}

            {/* Documents */}
            <div>
                <h2 className="font-semibold mb-2">Team documents</h2>
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                    {documents.map((d) => (
                        <li key={d.id} className="p-3 flex items-center justify-between">
                            <Link href={`/documents/${d.id}`} className="font-medium text-indigo-900 hover:underline">{d.filename}</Link>
                            <span className="text-xs text-gray-500">v{d.version} · {d.status}</span>
                        </li>
                    ))}
                    {documents.length === 0 && <li className="p-3 text-gray-500 text-sm">No documents yet.</li>}
                </ul>
            </div>
        </div>
    );
}