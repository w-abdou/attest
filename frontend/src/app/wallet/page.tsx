"use client";

import dynamic from "next/dynamic";
import RequireAuth from "@/components/RequireAuth";

const WalletPanel = dynamic(
    () => import("@/components/sui/WalletPanel").then((m) => m.WalletPanel),
    { ssr: false, loading: () => <p className="text-sm text-ink-500">Loading wallet…</p> },
);

export default function WalletPage() {
    return (
        <RequireAuth>
            <div className="mx-auto max-w-xl space-y-6">
                <div>
                    <h1 className="text-xl font-semibold text-ink-900">Your wallet</h1>
                    <p className="mt-1 text-sm text-ink-600">
                        The Sui wallet you signed in with. It also signs on-chain actions like
                        registering a document or a required signature.
                    </p>
                </div>
                <WalletPanel />
            </div>
        </RequireAuth>
    );
}
