"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, AuditLogResponse, DocumentResponse, VerifyResponse } from "@/lib/api";

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const documentId = Number(params.id);
  const { user, loading } = useAuth();
  const router = useRouter();

  const [doc, setDoc] = useState<DocumentResponse | null>(null);
  const [versions, setVersions] = useState<DocumentResponse[]>([]);
  const [audit, setAudit] = useState<AuditLogResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [amendFile, setAmendFile] = useState<File | null>(null);
  const [amendError, setAmendError] = useState<string | null>(null);
  const [amending, setAmending] = useState(false);

  const canAmend = user?.role === "ADMIN" || user?.role === "SIGNER";

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  async function loadAll() {
    setLoadError(null);
    try {
      const [docResult, versionsResult, auditResult] = await Promise.all([
        api.getDocument(documentId),
        api.getVersions(documentId),
        api.getAuditTrail(documentId),
      ]);
      setDoc(docResult);
      setVersions(versionsResult);
      setAudit(auditResult);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load this document.");
    }
  }

  useEffect(() => {
    if (user && !Number.isNaN(documentId)) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, documentId]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyFile) return;
    setVerifyError(null);
    setVerifyResult(null);
    setVerifying(true);
    try {
      const result = await api.verifyDocument(documentId, verifyFile);
      setVerifyResult(result);
    } catch (err) {
      setVerifyError(err instanceof ApiError ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleAmend(e: React.FormEvent) {
    e.preventDefault();
    if (!amendFile) return;
    setAmendError(null);
    setAmending(true);
    try {
      const newVersion = await api.amendDocument(documentId, amendFile);
      setAmendFile(null);
      (document.getElementById("amend-file-input") as HTMLInputElement).value = "";
      // Jump straight to the new version's own page — it has its own id and its
      // own hash, separate from the one you were just looking at.
      router.push(`/documents/${newVersion.id}`);
    } catch (err) {
      setAmendError(err instanceof ApiError ? err.message : "Amend failed.");
    } finally {
      setAmending(false);
    }
  }

  if (loading || !user) return null;
  if (loadError) return <p className="text-red-600">{loadError}</p>;
  if (!doc) return <p className="text-gray-500">Loading...</p>;

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-bold">{doc.filename}</h1>
          <p className="text-sm text-gray-600">
            version {doc.version} · status {doc.status} · document id {doc.id}
          </p>
          <p className="text-xs text-gray-400 font-mono break-all mt-1">
            SHA-256: {doc.documentHash}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Every version has its own permanent hash and its own URL. Amending never
            changes this page — it creates a new version at its own page instead.
          </p>
        </div>

        <div className="border border-gray-200 rounded p-4 space-y-3">
          <h2 className="font-semibold">Verify integrity of THIS version (id {doc.id})</h2>
          <p className="text-sm text-gray-600">
            Upload a file to compare against this specific version&apos;s hash. If even
            one byte differs from what was uploaded as version {doc.version}, this will
            say so.
          </p>
          <form onSubmit={handleVerify} className="space-y-3">
            <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setVerifyFile(e.target.files?.[0] ?? null)}
            />
            <button
                type="submit"
                disabled={!verifyFile || verifying}
                className="px-4 py-2 bg-indigo-900 text-white rounded disabled:opacity-50"
            >
              {verifying ? "Checking..." : "Verify"}
            </button>
          </form>
          {verifyError && <p className="text-red-600 text-sm">{verifyError}</p>}
          {verifyResult && (
              <p
                  className={`text-sm font-medium rounded p-2 ${
                      verifyResult.verified
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                  }`}
              >
                {verifyResult.result}
              </p>
          )}
        </div>

        {canAmend && (
            <div className="border border-gray-200 rounded p-4 space-y-3">
              <h2 className="font-semibold">Amend (create a new version)</h2>
              <p className="text-sm text-gray-600">
                This never changes version {doc.version} — it creates a brand new version
                with its own id, and takes you to that new page.
              </p>
              <form onSubmit={handleAmend} className="space-y-3">
                <input
                    id="amend-file-input"
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setAmendFile(e.target.files?.[0] ?? null)}
                />
                <button
                    type="submit"
                    disabled={!amendFile || amending}
                    className="px-4 py-2 bg-indigo-900 text-white rounded disabled:opacity-50"
                >
                  {amending ? "Uploading..." : "Amend"}
                </button>
              </form>
              {amendError && <p className="text-red-600 text-sm">{amendError}</p>}
            </div>
        )}

        <div>
          <h2 className="font-semibold mb-2">Version history</h2>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
            {versions.map((v) => (
                <li key={v.id} className="p-3 text-sm flex justify-between items-center">
                  <Link
                      href={`/documents/${v.id}`}
                      className={`hover:underline ${
                          v.id === doc.id ? "font-semibold text-indigo-900" : "text-gray-700"
                      }`}
                  >
                    version {v.version} — {v.filename}
                    {v.id === doc.id && " (viewing)"}
                  </Link>
                  <span className="text-gray-400 font-mono text-xs">
                {v.documentHash.slice(0, 12)}...
              </span>
                </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold mb-2">Audit trail</h2>
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
            {audit.map((entry) => (
                <li key={entry.id} className="p-3 text-sm">
                  <span className="font-medium">{entry.action}</span>{" "}
                  <span className="text-gray-400 text-xs">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
                  {entry.detail && <p className="text-gray-500 text-xs mt-1">{entry.detail}</p>}
                </li>
            ))}
          </ul>
        </div>
      </div>
  );
}