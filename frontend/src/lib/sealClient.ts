import { SealClient, SessionKey } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { dAppKit } from "@/lib/dappKit";
import { getSuiReadClient } from "@/lib/suiReadClient";
import { ATTEST_PACKAGE_ID, TARGET } from "@/lib/attestContract";

// Independent testnet key servers, exactly as currently published in Sui's
// own Seal docs (docs.sui.io/sui-stack/seal/using-seal) — not something this
// app runs itself. Both must agree (threshold 2) to release a key.
const KEY_SERVERS = [
    { objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75", weight: 1 },
    { objectId: "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8", weight: 1 },
];
const THRESHOLD = 2;
const SESSION_KEY_TTL_MIN = 10;

let cachedSealClient: SealClient | null = null;
function getSealClient(): SealClient {
    if (!cachedSealClient) {
        cachedSealClient = new SealClient({
            suiClient: getSuiReadClient(),
            serverConfigs: KEY_SERVERS,
            verifyKeyServers: true,
        });
    }
    return cachedSealClient;
}

/** Encrypts plaintext under the given Seal identity. No raw key is returned or kept. */
export async function encryptForSeal(idHex: string, plaintext: Uint8Array): Promise<Uint8Array> {
    const { encryptedObject } = await getSealClient().encrypt({
        threshold: THRESHOLD,
        packageId: ATTEST_PACKAGE_ID,
        id: idHex,
        data: plaintext,
    });
    return encryptedObject;
}

// A SessionKey needs a real wallet signature (a user-visible prompt) to
// become usable, so it's worth reusing across multiple decrypts within the
// same tab rather than asking again every time — it's valid for
// SESSION_KEY_TTL_MIN regardless. Keyed by address in case the connected
// account changes mid-session. Cleared on page reload; that's an acceptable
// re-prompt, not a correctness issue.
let cachedSessionKey: { address: string; sessionKey: SessionKey } | null = null;

async function getSessionKey(address: string): Promise<SessionKey> {
    if (cachedSessionKey && cachedSessionKey.address === address && !cachedSessionKey.sessionKey.isExpired()) {
        return cachedSessionKey.sessionKey;
    }

    const sessionKey = await SessionKey.create({
        address,
        packageId: ATTEST_PACKAGE_ID,
        ttlMin: SESSION_KEY_TTL_MIN,
        suiClient: getSuiReadClient(),
    });

    // Proves this session key really speaks for `address` — the connected
    // wallet signs a plain personal message (no gas, no on-chain transaction),
    // which is the wallet-standard feature every extension wallet supports,
    // unlike the raw-keypair Signer Walrus itself needs (see walrusClient.ts).
    const { signature } = await dAppKit.signPersonalMessage({ message: sessionKey.getPersonalMessage() });
    await sessionKey.setPersonalMessageSignature(signature);

    cachedSessionKey = { address, sessionKey };
    return sessionKey;
}

/**
 * Requests the decryption key from Seal's key servers (gated by the
 * on-chain seal_approve policy on the given DocumentProof) and decrypts.
 * Throws if the requester isn't authorized — the key servers simply refuse
 * to release a key share, which surfaces here as a rejected promise.
 */
export async function decryptForSeal(
    idHex: string,
    onchainObjectId: string,
    requesterAddress: string,
    ciphertext: Uint8Array,
): Promise<Uint8Array> {
    const sessionKey = await getSessionKey(requesterAddress);

    const tx = new Transaction();
    tx.moveCall({
        target: TARGET.sealApprove,
        arguments: [
            tx.pure.vector("u8", Array.from(fromHex(idHex))),
            tx.object(onchainObjectId),
        ],
    });
    // Transaction-kind-only: no sender/gas needed — this is never signed or
    // executed, only evaluated by each key server via its own dry-run.
    const txBytes = await tx.build({ client: getSuiReadClient(), onlyTransactionKind: true });

    return getSealClient().decrypt({ data: ciphertext, sessionKey, txBytes });
}

/** The connected wallet's address, read without a React hook (for use in plain lib code). */
export function getConnectedAddress(): string | null {
    return dAppKit.stores.$connection.get().account?.address ?? null;
}
