"use client";

import dynamic from "next/dynamic";


const WalletPanel = dynamic(
    () => import("@/components/sui/WalletPanel").then((m) => m.WalletPanel),
    { ssr: false, loading: () => <p className="text-sm text-ink-500">Loading wallet…</p> },
);

export default function WalletPage() {
    return (
        <div className="mx-auto max-w-xl space-y-6">
            <div>
                <h1 className="text-xl font-semibold text-ink-900">Sui wallet</h1>
                <p className="mt-1 text-sm text-ink-600">
                    Connect a Sui wallet to Attest. This is the groundwork for on-chain
                    signing — for now it just proves the connection works and reads your
                    account from the Sui testnet.
                </p>
            </div>
            <WalletPanel />
        </div>
    );
}