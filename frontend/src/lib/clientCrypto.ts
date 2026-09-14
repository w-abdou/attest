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

const AES_KEY_LENGTH_BITS = 256;
const GCM_IV_LENGTH_BYTES = 12;

/**
 * Slice B: a locally-managed AES-256-GCM key, generated fresh per document —
 * no Seal/on-chain access control yet, that's a later slice (see
 * docs/security-assessment.md). The IV is generated fresh per encryption and
 * prepended to the ciphertext, so only the raw key needs to travel alongside
 * the document; decryptBytes reads the IV back off the front.
 */
export async function encryptBytes(plaintext: Uint8Array): Promise<{ ciphertextWithIv: Uint8Array; keyBase64: string }> {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: AES_KEY_LENGTH_BITS }, true, [
        "encrypt",
        "decrypt",
    ]);
    const iv = crypto.getRandomValues(new Uint8Array(GCM_IV_LENGTH_BYTES));
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext.buffer as ArrayBuffer),
    );

    const combined = new Uint8Array(iv.length + ciphertext.length);
    combined.set(iv, 0);
    combined.set(ciphertext, iv.length);

    const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    return { ciphertextWithIv: combined, keyBase64: uint8ToBase64(rawKey) };
}

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

function uint8ToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}
