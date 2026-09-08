"use client";

import { DAppKitProvider, useCurrentAccount, useCurrentNetwork } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { dAppKit } from "@/lib/dappKit";

function ConnectedDetails() {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();

    if (!account) {
        return (
            <p className="text-sm text-ink-500">
                No wallet connected yet. Use the button above to connect your Sui wallet.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Network</p>
                <p className="text-sm text-ink-900">{network}</p>
            </div>
            <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Address</p>
                <p className="break-all font-mono text-sm text-ink-900">{account.address}</p>
            </div>
            {account.label && (
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Label</p>
                    <p className="text-sm text-ink-900">{account.label}</p>
                </div>
            )}
        </div>
    );
}

export function WalletPanel() {
    return (
        <DAppKitProvider dAppKit={dAppKit}>
            <div className="space-y-6">
                <div>
                    <ConnectButton />
                </div>
                <div className="rounded-xl border border-ink-200 bg-white p-5">
                    <ConnectedDetails />
                </div>
            </div>
        </DAppKitProvider>
    );
}