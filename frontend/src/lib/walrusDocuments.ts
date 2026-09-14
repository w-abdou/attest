import * as api from "@/lib/api";
import { DocumentResponse, VerifyResponse } from "@/lib/api";
import { sha256Hex } from "@/lib/clientCrypto";
import { uploadBlobToWalrus, downloadBlobFromWalrus } from "@/lib/walrusClient";

/**
 * Client-direct upload: the backend never receives these bytes. The browser
 * hashes the plaintext, puts it straight on Walrus, and only then tells the
 * backend the resulting metadata (filename, hash, blob id).
 */
export async function uploadDocumentViaWalrus(teamId: number, file: File): Promise<DocumentResponse> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const documentHash = await sha256Hex(bytes);
    const { blobId, blobObjectId } = await uploadBlobToWalrus(bytes);

    return api.uploadToTeamWalrus(teamId, {
        filename: file.name,
        contentType: file.type || "application/pdf",
        documentHash,
        walrusBlobId: blobId,
        walrusBlobObjectId: blobObjectId,
        size: bytes.byteLength,
    });
}

export async function amendDocumentViaWalrus(documentId: number, file: File): Promise<DocumentResponse> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const documentHash = await sha256Hex(bytes);
    const { blobId, blobObjectId } = await uploadBlobToWalrus(bytes);

    return api.amendDocumentWalrus(documentId, {
        filename: file.name,
        contentType: file.type || "application/pdf",
        documentHash,
        walrusBlobId: blobId,
        walrusBlobObjectId: blobObjectId,
        size: bytes.byteLength,
    });
}

/** Fetches the stored blob back from Walrus as plaintext bytes. */
export async function fetchDocumentBytes(doc: DocumentResponse): Promise<Uint8Array> {
    if (!doc.walrusBlobId) {
        throw new Error("This document has no Walrus blob to fetch.");
    }
    return downloadBlobFromWalrus(doc.walrusBlobId);
}

/** Downloads the stored blob back from Walrus and triggers a browser save. */
export async function downloadDocumentViaWalrus(doc: DocumentResponse): Promise<void> {
    const bytes = await fetchDocumentBytes(doc);
    const blob = new Blob([bytes.buffer as ArrayBuffer], { type: doc.contentType || "application/pdf" });
    const url = URL.createObjectURL(blob);
    try {
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.filename;
        link.click();
    } finally {
        URL.revokeObjectURL(url);
    }
}

/** Downloads the stored blob back from Walrus and re-hashes it against the recorded documentHash. */
export async function verifyDocumentViaWalrus(doc: DocumentResponse): Promise<VerifyResponse> {
    const bytes = await fetchDocumentBytes(doc);
    const documentHash = await sha256Hex(bytes);
    return api.verifyDocumentHash(doc.id, documentHash);
}
