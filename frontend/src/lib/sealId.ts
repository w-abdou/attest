/**
 * A document's Seal "identity" is a fresh, random 16-byte value, hex-encoded
 * (no `0x` prefix, matching @mysten/seal's `id` string convention) — chosen
 * client-side at encryption time, before the document is ever registered
 * on-chain (Seal encryption needs no on-chain object to exist yet). It is
 * then:
 *
 *  - sent to the backend alongside the rest of the upload metadata and
 *    stored on the Document row (never derived or recomputed — encryption
 *    already baked this exact value into the ciphertext, so it has to be
 *    carried forward verbatim or the document becomes undecryptable);
 *  - passed to register_document() when the document is later registered
 *    on-chain, where it's stored on the DocumentProof as document_id;
 *  - passed as the `id` argument to the seal_approve Move call at decrypt
 *    time, which checks it matches what was stored.
 *
 * A document that isn't Seal-encrypted still needs *some* document_id to
 * satisfy register_document's signature — for those, a fresh id generated
 * here at registration time is fine, since nothing ever reads it back.
 */
export function generateSealIdHex(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
