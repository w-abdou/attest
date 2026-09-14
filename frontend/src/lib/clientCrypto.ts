// Runs entirely in the browser via Web Crypto (SubtleCrypto) — nothing here
// ever touches the backend. This is documentHash's source of truth for
// Walrus-backed documents: computed over the original plaintext, before any
// encryption, so it stays the same "is this the original document" proof
// regardless of storage backend.

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", bytes.buffer as ArrayBuffer);
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
