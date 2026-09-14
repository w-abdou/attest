import { WalrusClient } from "@mysten/walrus";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

// Same testnet full-node gRPC endpoint dAppKit uses (see lib/dappKit.ts) —
// Walrus operations don't go through the connected wallet, so this is a
// separate, unauthenticated client purely for talking to the Walrus/Sui
// network directly.
const GRPC_URL = "https://fullnode.testnet.sui.io:443";

// Walrus testnet has ~100 independent storage nodes; writing directly to each
// of them requires the caller to open a connection to every one, which plenty
// of browsers (and sandboxed/firewalled environments generally) cannot do
// reliably — some subset of those hosts is routinely unreachable. Mysten runs
// a public testnet upload relay for exactly this: the browser talks to this
// one HTTPS endpoint, and the relay does the per-node fan-out on its behalf.
// This is the officially recommended way to write blobs from a browser
// client, not a workaround.
const UPLOAD_RELAY_HOST = "https://upload-relay.testnet.walrus.space";

// The read-side equivalent of the upload relay: an aggregator fans a read out
// to enough storage nodes to reconstruct the blob and serves it back over one
// plain HTTPS GET, so downloads have the same single-host-connectivity shape
// as uploads. Mysten runs this one publicly for testnet.
const AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space";

const STORAGE_EPOCHS = Number(process.env.NEXT_PUBLIC_WALRUS_STORAGE_EPOCHS ?? "5");

/**
 * Whether a Walrus storage signer is configured for this deployment. The
 * upload/amend/download UI falls back to the local-disk backend entirely
 * when this is false — Walrus is opt-in, not a hard requirement.
 */
export function isWalrusConfigured(): boolean {
    return Boolean(process.env.NEXT_PUBLIC_WALRUS_SIGNER_SECRET_KEY);
}

let cachedSuiClient: SuiGrpcClient | null = null;
function getSuiClient(): SuiGrpcClient {
    if (!cachedSuiClient) {
        cachedSuiClient = new SuiGrpcClient({ network: "testnet", baseUrl: GRPC_URL });
    }
    return cachedSuiClient;
}

let cachedWalrusClient: WalrusClient | null = null;
function getWalrusClient(): WalrusClient {
    if (!cachedWalrusClient) {
        cachedWalrusClient = new WalrusClient({
            network: "testnet",
            suiClient: getSuiClient(),
            uploadRelay: {
                host: UPLOAD_RELAY_HOST,
                // Small, fixed cap in MIST on what the relay's tip can cost us per
                // upload — the relay publishes its actual tip via /v1/tip-config;
                // this is just a safety ceiling, not the amount we expect to pay.
                sendTip: { max: 1_000_000 },
            },
        });
    }
    return cachedWalrusClient;
}

/**
 * The dedicated app-managed keypair that pays for and certifies Walrus blobs.
 * This is NOT the user's own wallet — @mysten/walrus's writeBlob/readBlob need
 * a raw Signer (a keypair capable of signing arbitrary bytes), which a
 * browser wallet extension never exposes (it only signs transactions/messages
 * through the wallet-standard API). See docs/security-assessment.md for why.
 */
function getStorageSigner(): Ed25519Keypair {
    const secretKey = process.env.NEXT_PUBLIC_WALRUS_SIGNER_SECRET_KEY;
    if (!secretKey) {
        throw new Error(
            "Walrus storage is not configured (NEXT_PUBLIC_WALRUS_SIGNER_SECRET_KEY is not set).",
        );
    }
    return Ed25519Keypair.fromSecretKey(secretKey);
}

export interface WalrusUploadResult {
    blobId: string;
    blobObjectId: string;
}

/** Uploads bytes (plaintext for slice A, ciphertext for slice B) straight to Walrus. */
export async function uploadBlobToWalrus(bytes: Uint8Array): Promise<WalrusUploadResult> {
    const { blobId, blobObject } = await getWalrusClient().writeBlob({
        blob: bytes,
        deletable: true,
        epochs: STORAGE_EPOCHS,
        signer: getStorageSigner(),
    });
    return { blobId, blobObjectId: blobObject.id };
}

/**
 * Downloads raw bytes from Walrus by blob id via the public aggregator's HTTP
 * API — no signer needed, reads aren't transactions. Deliberately not
 * WalrusClient.readBlob(), which talks directly to storage nodes: fine on an
 * unrestricted network, but exactly the many-hosts problem the upload relay
 * solves for writes (see UPLOAD_RELAY_HOST above), just on the read side.
 */
export async function downloadBlobFromWalrus(blobId: string): Promise<Uint8Array> {
    const res = await fetch(`${AGGREGATOR_URL}/v1/blobs/${encodeURIComponent(blobId)}`);
    if (!res.ok) {
        throw new Error(`Could not fetch blob ${blobId} from Walrus (HTTP ${res.status}).`);
    }
    return new Uint8Array(await res.arrayBuffer());
}
