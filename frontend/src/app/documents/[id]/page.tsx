"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, AuditLogResponse, DocumentResponse, SignatureResponse, TeamMemberResponse, VerifyResponse } from "@/lib/api";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const documentId = Number(params.id);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentResponse | null>(null);
  const [versions, setVersions] = useState<DocumentResponse[]>([]);
  const [audit, setAudit] = useState<AuditLogResponse[]>([]);
  const [signers, setSigners] = useState<SignatureResponse[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [amendFile, setAmendFile] = useState<File | null>(null);
  const [amendError, setAmendError] = useState<string | null>(null);

  const [selectedSigners, setSelectedSigners] = useState<number[]>([]);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);

  const isUploader = doc?.ownerId === user?.id;
  const iAmAssigned = signers.some((s) => s.signerId === user?.id);
  const iHaveSigned = signers.some((s) => s.signerId === user?.id && s.signed);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [docResult, versionsResult, auditResult, signersResult] = await Promise.all([
        api.getDocument(documentId),
        api.getVersions(documentId),
        api.getAuditTrail(documentId),
        api.getSigners(documentId),
      ]);
      setDoc(docResult);
      setVersions(versionsResult);
      setAudit(auditResult);
      setSigners(signersResult);
      setSelectedSigners(signersResult.map((s) => s.signerId));
      try { setTeamMembers(await api.listMembers(docResult.teamId)); } catch { /* viewers still see doc */ }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load this document.");
    }
  }, [documentId]);

  useEffect(() => { if (user && !Number.isNaN(documentId)) loadAll(); }, [user, documentId, loadAll]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyFile) return;
    setVerifyError(null); setVerifyResult(null);
    try { setVerifyResult(await api.verifyDocument(documentId, verifyFile)); }
    catch (err) { setVerifyError(err instanceof ApiError ? err.message : "Verification failed."); }
  }
  async function handleAmend(e: React.FormEvent) {
    e.preventDefault();
    if (!amendFile) return;
    setAmendError(null);
    try {
      const newVersion = await api.amendDocument(documentId, amendFile);
      router.push(`/documents/${newVersion.id}`);
    } catch (err) { setAmendError(err instanceof ApiError ? err.message : "Amend failed."); }
  }
  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setAssignError(null);
    try { await api.assignSigners(documentId, selectedSigners); await loadAll(); }
    catch (err) { setAssignError(err instanceof ApiError ? err.message : "Could not assign signers."); }
  }
  async function handleSign() {
    setSignError(null);
    try { await api.signDocument(documentId); await loadAll(); }
    catch (err) { setSignError(err instanceof ApiError ? err.message : "Could not sign."); }
  }

  function toggleSigner(userId: number) {
    setSelectedSigners((prev) => prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]);
  }

  if (loading || !user) return null;
  if (loadError) return <p className="text-red-600">{loadError}</p>;
  if (!doc) return <p className="text-gray-500">Loading...</p>;

  return (
      <div className="space-y-8">
        <div>
          <Link href={`/teams/${doc.teamId}`} className="text-sm text-indigo-900 hover:underline">← Back to team</Link>
          <h1 className="text-xl font-bold mt-1">{doc.filename}</h1>
          <p className="text-sm text-gray-600">version {doc.version} · status {doc.status} · document id {doc.id}</p>
          <p className="text-xs text-gray-400 font-mono break-all mt-1">SHA-256: {doc.documentHash}</p>
        </div>

        {/* Verify */}
        <div className="border border-gray-200 rounded p-4 space-y-3">
          <h2 className="font-semibold">Verify integrity of this version</h2>
          <form onSubmit={handleVerify} className="space-y-3">
            <input type="file" accept="application/pdf" onChange={(e) => setVerifyFile(e.target.files?.[0] ?? null)} />
            <button type="submit" disabled={!verifyFile} className="px-4 py-2 bg-indigo-900 text-white rounded disabled:opacity-50">Verify</button>
          </form>
          {verifyError && <p className="text-red-600 text-sm">{verifyError}</p>}
          {verifyResult && (
              <p className={`text-sm font-medium rounded p-2 ${verifyResult.verified ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {verifyResult.result}
              </p>
          )}
        </div>

        {/* Required signers + signing */}
        <div className="border border-gray-200 rounded p-4 space-y-3">
          <h2 className="font-semibold">Required signers</h2>
          {signers.length === 0 && <p className="text-sm text-gray-500">No signers assigned yet.</p>}
          <ul className="divide-y divide-gray-200">
            {signers.map((s) => (
                <li key={s.signerId} className="py-2 text-sm flex justify-between">
                  <span>{s.email} <span className="text-gray-400">(id {s.signerId})</span></span>
                  <span className={s.signed ? "text-green-700" : "text-gray-500"}>
                {s.signed ? `signed ${s.signedAt ? new Date(s.signedAt).toLocaleString() : ""}` : "not signed"}
              </span>
                </li>
            ))}
          </ul>

          {iAmAssigned && !iHaveSigned && (
              <button onClick={handleSign} className="px-4 py-2 bg-green-700 text-white rounded">Sign this document</button>
          )}
          {iHaveSigned && <p className="text-sm text-green-700">You have signed this version.</p>}
          {signError && <p className="text-red-600 text-sm">{signError}</p>}

          {isUploader && teamMembers.length > 0 && (
              <form onSubmit={handleAssign} className="pt-3 border-t border-gray-100 space-y-2">
                <p className="text-sm font-medium">Assign required signers (you uploaded this):</p>
                <div className="space-y-1">
                  {teamMembers.map((m) => (
                      <label key={m.userId} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={selectedSigners.includes(m.userId)} onChange={() => toggleSigner(m.userId)} />
                        {m.email} <span className="text-gray-400">({m.teamRole})</span>
                      </label>
                  ))}
                </div>
                <button type="submit" className="px-3 py-1 bg-indigo-900 text-white rounded text-sm">Save signers</button>
                {assignError && <p className="text-red-600 text-sm">{assignError}</p>}
              </form>
          )}
        </div>

        {/* Amend */}
        <div className="border border-gray-200 rounded p-4 space-y-3">
          <h2 className="font-semibold">Amend (new version)</h2>
          <p className="text-sm text-gray-600">Creates a new version with its own hash. Signatures do not carry over.</p>
          <form onSubmit={handleAmend} className="space-y-3">
            <input id="amend-file-input" type="file" accept="application/pdf" onChange={(e) => setAmendFile(e.target.files?.[0] ?? null)} />
            <button type="submit" disabled={!amendFile} className="px-4 py-2 bg-indigo-900 text-white rounded disabled:opacity-50">Amend</button>
          </form>
          {amendError && <p className="text-red-600 text-sm">{amendError}</p>}
        </div>

        {/* Version history */}
        <div>
          <h2 className="font-semibold mb-2">Version history</h2>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
            {versions.map((v) => (
                <li key={v.id} className="p-3 text-sm flex justify-between items-center">
                  <Link href={`/documents/${v.id}`} className={`hover:underline ${v.id === doc.id ? "font-semibold text-indigo-900" : "text-gray-700"}`}>
                    version {v.version} — {v.filename}{v.id === doc.id && " (viewing)"}
                  </Link>
                  <span className="text-gray-400 font-mono text-xs">{v.documentHash.slice(0, 12)}...</span>
                </li>
            ))}
          </ul>
        </div>

        {/* Audit */}
        <div>
          <h2 className="font-semibold mb-2">Audit trail</h2>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
            {audit.map((entry) => (
                <li key={entry.id} className="p-3 text-sm">
                  <span className="font-medium">{entry.action}</span>{" "}
                  <span className="text-gray-400 text-xs">{new Date(entry.timestamp).toLocaleString()}</span>
                  {entry.detail && <p className="text-gray-500 text-xs mt-1">{entry.detail}</p>}
                </li>
            ))}
          </ul>
        </div>
      </div>
  );
}