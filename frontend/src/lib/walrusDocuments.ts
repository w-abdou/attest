import * as api from "@/lib/api";
import { DocumentResponse, VerifyResponse } from "@/lib/api";
import { decryptBytes, sha256Hex } from "@/lib/clientCrypto";
import { uploadBlobToWalrus, downloadBlobFromWalrus } from "@/lib/walrusClient";
import { encryptForSeal, decryptForSeal, getConnectedAddress } from "@/lib/sealClient";
import { generateSealIdHex } from "@/lib/sealId";

/**
 * Client-direct upload: the backend never receives plaintext (or any bytes
 * at all). The browser hashes the plaintext, encrypts it with Seal under a
 * fresh identity, puts the ciphertext on Walrus, and only then tells the
 * backend the resulting metadata (filename, plaintext hash, blob id, Seal
 * identity) — never a raw key. See docs/security-assessment.md "Seal access
 * control" for what actually gates decryption (an on-chain policy, checked
 * by Seal's key servers) versus the older locally-managed-key scheme this
 * replaces.
 */
export async function uploadDocumentViaWalrus(teamId: number, file: File): Promise<DocumentResponse> {
    const plaintext = new Uint8Array(await file.arrayBuffer());
    const documentHash = await sha256Hex(plaintext);
    const sealIdHex = generateSealIdHex();
    const ciphertext = await encryptForSeal(sealIdHex, plaintext);
    const { blobId, blobObjectId } = await uploadBlobToWalrus(ciphertext);

    return api.uploadToTeamWalrus(teamId, {
        filename: file.name,
        contentType: file.type || "application/pdf",
        documentHash,
        walrusBlobId: blobId,
        walrusBlobObjectId: blobObjectId,
        size: plaintext.byteLength,
        encryptionKeyBase64: null,
        sealEncrypted: true,
        sealIdHex,
    });
}

export async function amendDocumentViaWalrus(documentId: number, file: File): Promise<DocumentResponse> {
    const plaintext = new Uint8Array(await file.arrayBuffer());
    const documentHash = await sha256Hex(plaintext);
    const sealIdHex = generateSealIdHex();
    const ciphertext = await encryptForSeal(sealIdHex, plaintext);
    const { blobId, blobObjectId } = await uploadBlobToWalrus(ciphertext);

    return api.amendDocumentWalrus(documentId, {
        filename: file.name,
        contentType: file.type || "application/pdf",
        documentHash,
        walrusBlobId: blobId,
        walrusBlobObjectId: blobObjectId,
        size: plaintext.byteLength,
        encryptionKeyBase64: null,
        sealEncrypted: true,
        sealIdHex,
    });
}

/**
 * Fetches the stored blob back from Walrus and returns plaintext bytes.
 *
 * - Seal-protected documents (sealEncrypted) require the document to already
 *   be registered on-chain (onchainObjectId set) — there is no DocumentProof
 *   for seal_approve to check otherwise, so no one, not even the uploader,
 *   can decrypt it yet. This throws a clear, specific error in that case
 *   rather than a confusing Seal SDK failure.
 * - A document still on the older local-AES scheme (encryptionKeyBase64 set)
 *   decrypts with that key directly, for backward compatibility.
 * - An unencrypted (slice A) document is returned as-is.
 */
export async function fetchDocumentBytes(doc: DocumentResponse): Promise<Uint8Array> {
    if (!doc.walrusBlobId) {
        throw new Error("This document has no Walrus blob to fetch.");
    }
    const stored = await downloadBlobFromWalrus(doc.walrusBlobId);

    if (doc.sealEncrypted) {
        if (!doc.onchainObjectId || !doc.sealIdHex) {
            throw new Error(
                "This document must be registered on-chain before it can be decrypted — register it first.",
            );
        }
        const address = getConnectedAddress();
        if (!address) {
            throw new Error("Connect your Sui wallet to decrypt this document.");
        }
        return decryptForSeal(doc.sealIdHex, doc.onchainObjectId, address, stored);
    }
    if (doc.encryptionKeyBase64) {
        return decryptBytes(stored, doc.encryptionKeyBase64);
    }
    return stored;
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
