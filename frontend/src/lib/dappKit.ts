import { createDAppKit } from "@mysten/dapp-kit-react";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { registerEnokiWallets, isEnokiNetwork } from "@mysten/enoki";

// Testnet full-node gRPC endpoint. We use testnet because that's where the
// throwaway hello_attest package was published and where Attest's Week 2
// contract will live during development.
const GRPC_URLS = {
    testnet: "https://fullnode.testnet.sui.io:443",
} as const;

export const dAppKit = createDAppKit({
    networks: ["testnet"],
    defaultNetwork: "testnet",
    createClient(network) {
        return new SuiGrpcClient({ network, baseUrl: GRPC_URLS[network] });
    },
});

// Registers the instance's types globally so hooks like useCurrentNetwork()
// infer "testnet" as the network type rather than a generic string.
declare module "@mysten/dapp-kit-react" {
    interface Register {
        dAppKit: typeof dAppKit;
    }
}

// --- Enoki zkLogin (Google) ---
// Registering Enoki wallets makes "Sign in with Google" appear as an option
// inside the SAME ConnectButton modal the extension wallets use — no separate
// login flow. This only runs in the browser: the OAuth pop-up and wallet-
// standard registration need window, and this whole module is loaded only
// through a client-only, ssr:false dynamic import. The typeof-window guard is
// belt-and-suspenders in case the module is ever imported server-side.
const ENOKI_API_KEY = process.env.NEXT_PUBLIC_ENOKI_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

if (typeof window !== "undefined" && ENOKI_API_KEY && GOOGLE_CLIENT_ID) {
    // Enoki only supports certain networks; guard so a future non-Enoki network
    // (e.g. localnet) doesn't throw.
    if (isEnokiNetwork(dAppKit.stores.$currentNetwork.get())) {
        registerEnokiWallets({
            apiKey: ENOKI_API_KEY,
            providers: {
                google: {
                    clientId: GOOGLE_CLIENT_ID,
                    // The OAuth pop-up returns to the current origin. Registering
                    // http://localhost:3000 in the Google console (which you did) is
                    // what makes this redirect valid.
                    redirectUrl: window.location.origin,
                },
            },
            // Wire Enoki to the dApp Kit instance's own clients + current-network
            // getter — this is the current (dApp Kit 2.0) integration shape.
            clients: dAppKit.networks.map((network) => dAppKit.getClient(network)),
            getCurrentNetwork: () => dAppKit.stores.$currentNetwork.get(),
        });
    }
}