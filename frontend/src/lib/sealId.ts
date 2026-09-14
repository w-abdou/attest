/**
 * The Seal "identity" for a document is derived directly from Attest's own
 * numeric document id — an 8-byte big-endian encoding, hex-encoded (no `0x`
 * prefix, matching @mysten/seal's `id` string convention). It's computed the
 * same way on both sides of the document's lifetime:
 *
 *  - At upload time (before any on-chain object exists), the browser uses it
 *    as the `id` passed to SealClient.encrypt() — Seal encryption needs no
 *    on-chain object, just an identity to derive the key under.
 *  - At registration time, the same bytes are passed to register_document()
 *    and stored on the DocumentProof as document_id.
 *  - At decrypt time, the same bytes are passed as the `id` argument to the
 *    seal_approve Move call, which checks it matches what was stored.
 *
 * Kept in one place so all three call sites can never disagree on the
 * encoding (a mismatch there would either make a document permanently
 * undecryptable, or — if the encodings collided — blur two documents'
 * identities together).
 */
export function sealIdHex(documentId: number): string {
    if (!Number.isInteger(documentId) || documentId < 0) {
        throw new Error(`documentId must be a non-negative integer, got ${documentId}`);
    }
    return BigInt(documentId).toString(16).padStart(16, "0");
}
