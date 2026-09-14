import { SuiGrpcClient } from "@mysten/sui/grpc";

// Same testnet full-node gRPC endpoint dAppKit uses (see lib/dappKit.ts) —
// Walrus and Seal operations don't go through the connected wallet's own
// client, so this is a separate, unauthenticated client purely for reading
// on-chain state and building/simulating transactions. Shared by
// walrusClient.ts and sealClient.ts so both use one instance rather than
// opening a redundant connection each.
const GRPC_URL = "https://fullnode.testnet.sui.io:443";

let cached: SuiGrpcClient | null = null;

export function getSuiReadClient(): SuiGrpcClient {
    if (!cached) {
        cached = new SuiGrpcClient({ network: "testnet", baseUrl: GRPC_URL });
    }
    return cached;
}
