import * as api from "@/lib/api";
import { DocumentResponse, VerifyResponse } from "@/lib/api";
import { decryptBytes, encryptBytes, sha256Hex } from "@/lib/clientCrypto";
import { uploadBlobToWalrus, downloadBlobFromWalrus } from "@/lib/walrusClient";

/**
 * Client-direct upload: the backend never receives plaintext (or any bytes
 * at all). The browser hashes the plaintext, encrypts it with a fresh
 * AES-256-GCM key, puts the ciphertext on Walrus, and only then tells the
 * backend the resulting metadata (filename, plaintext hash, blob id, key).
 * See docs/security-assessment.md "Walrus decentralized storage" for what
 * this key does and does not protect against — it's a locally-managed key,
 * not Seal-backed access control.
 */
export async function uploadDocumentViaWalrus(teamId: number, file: File): Promise<DocumentResponse> {
    const plaintext = new Uint8Array(await file.arrayBuffer());
    const documentHash = await sha256Hex(plaintext);
    const { ciphertextWithIv, keyBase64 } = await encryptBytes(plaintext);
    const { blobId, blobObjectId } = await uploadBlobToWalrus(ciphertextWithIv);

    return api.uploadToTeamWalrus(teamId, {
        filename: file.name,
        contentType: file.type || "application/pdf",
        documentHash,
        walrusBlobId: blobId,
        walrusBlobObjectId: blobObjectId,
        size: plaintext.byteLength,
        encryptionKeyBase64: keyBase64,
    });
}

export async function amendDocumentViaWalrus(documentId: number, file: File): Promise<DocumentResponse> {
    const plaintext = new Uint8Array(await file.arrayBuffer());
    const documentHash = await sha256Hex(plaintext);
    const { ciphertextWithIv, keyBase64 } = await encryptBytes(plaintext);
    const { blobId, blobObjectId } = await uploadBlobToWalrus(ciphertextWithIv);

    return api.amendDocumentWalrus(documentId, {
        filename: file.name,
        contentType: file.type || "application/pdf",
        documentHash,
        walrusBlobId: blobId,
        walrusBlobObjectId: blobObjectId,
        size: plaintext.byteLength,
        encryptionKeyBase64: keyBase64,
    });
}

/**
 * Fetches the stored blob back from Walrus and returns plaintext bytes —
 * decrypting first if the document was encrypted (encryptionKeyBase64 set).
 * An unencrypted (slice A) document has no key and is returned as-is.
 */
export async function fetchDocumentBytes(doc: DocumentResponse): Promise<Uint8Array> {
    if (!doc.walrusBlobId) {
        throw new Error("This document has no Walrus blob to fetch.");
    }
    const stored = await downloadBlobFromWalrus(doc.walrusBlobId);
    if (!doc.encryptionKeyBase64) {
        return stored;
    }
    return decryptBytes(stored, doc.encryptionKeyBase64);
}

/** Downloads the stored blob back from Walrus (decrypting if needed) and triggers a browser save. */
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

/** Downloads the stored blob back from Walrus (decrypting if needed) and re-hashes it against the recorded documentHash. */
export async function verifyDocumentViaWalrus(doc: DocumentResponse): Promise<VerifyResponse> {
    const bytes = await fetchDocumentBytes(doc);
    const documentHash = await sha256Hex(bytes);
    return api.verifyDocumentHash(doc.id, documentHash);
}
