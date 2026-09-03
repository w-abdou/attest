"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, DocumentResponse } from "@/lib/api";

export default function DocumentsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<DocumentResponse[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [fetching, setFetching] = useState(true);
    const [file, setFile] = useState<File | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const canUpload = user?.role === "ADMIN" || user?.role === "SIGNER";

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/login");
        }
    }, [loading, user, router]);

    async function loadDocuments() {
        setFetching(true);
        setFetchError(null);
        try {
            const docs = await api.listDocuments();
            setDocuments(docs);
        } catch (err) {
            setFetchError(err instanceof ApiError ? err.message : "Could not load documents.");
        } finally {
            setFetching(false);
        }
    }

    useEffect(() => {
        if (user) {
            loadDocuments();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!file) return;
        setUploadError(null);
        setUploading(true);
        try {
            await api.uploadDocument(file);
            setFile(null);
            (document.getElementById("file-input") as HTMLInputElement).value = "";
            await loadDocuments();
        } catch (err) {
            setUploadError(err instanceof ApiError ? err.message : "Upload failed.");
        } finally {
            setUploading(false);
        }
    }

    if (loading || !user) return null;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-xl font-bold mb-1">Your documents</h1>
                <p className="text-sm text-gray-600">
                    Logged in as {user.email} — role: {user.role} — user id: {user.id}
                </p>
            </div>

            {canUpload ? (
                <form onSubmit={handleUpload} className="border border-gray-200 rounded p-4 space-y-3">
                    <h2 className="font-semibold">Upload a PDF</h2>
                    <input
                        id="file-input"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}
                    <button
                        type="submit"
                        disabled={!file || uploading}
                        className="px-4 py-2 bg-indigo-900 text-white rounded disabled:opacity-50"
                    >
                        {uploading ? "Uploading..." : "Upload"}
                    </button>
                </form>
            ) : (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                    Your account is a VIEWER, so it can&apos;t upload documents. Ask an
                    administrator to promote it to SIGNER (your user id is {user.id}).
                </p>
            )}

            <div>
                <h2 className="font-semibold mb-2">Documents you own</h2>
                {fetching && <p className="text-gray-500 text-sm">Loading...</p>}
                {fetchError && <p className="text-red-600 text-sm">{fetchError}</p>}
                {!fetching && documents.length === 0 && !fetchError && (
                    <p className="text-gray-500 text-sm">No documents yet.</p>
                )}
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                    {documents.map((doc) => (
                        <li key={doc.id} className="p-3 flex items-center justify-between">
                            <div>
                                <Link
                                    href={`/documents/${doc.id}`}
                                    className="font-medium text-indigo-900 hover:underline"
                                >
                                    {doc.filename}
                                </Link>
                                <p className="text-xs text-gray-500">
                                    version {doc.version} · status {doc.status}
                                </p>
                            </div>
                            <span className="text-xs text-gray-400">
                {new Date(doc.createdAt).toLocaleString()}
              </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}