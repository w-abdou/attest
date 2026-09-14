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

const GCM_IV_LENGTH_BYTES = 12;

/**
 * Decrypts a document still on the older locally-managed AES-256-GCM scheme
 * (encryptionKeyBase64 set) — kept only for backward compatibility with
 * documents encrypted before Seal landed; every new upload uses Seal instead
 * (see lib/sealClient.ts). The IV is the first GCM_IV_LENGTH_BYTES of the
 * stored bytes, exactly as it was prepended at encryption time.
 */
export async function decryptBytes(ciphertextWithIv: Uint8Array, keyBase64: string): Promise<Uint8Array> {
    const iv = ciphertextWithIv.slice(0, GCM_IV_LENGTH_BYTES);
    const ciphertext = ciphertextWithIv.slice(GCM_IV_LENGTH_BYTES);
    const rawKey = base64ToUint8(keyBase64);
    const key = await crypto.subtle.importKey("raw", rawKey.buffer as ArrayBuffer, "AES-GCM", true, ["decrypt"]);
    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
        key,
        ciphertext.buffer as ArrayBuffer,
    );
    return new Uint8Array(plaintext);
}

function base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
