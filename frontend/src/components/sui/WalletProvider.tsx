"use client";

import dynamic from "next/dynamic";

const DAppKitClientProvider = dynamic(
    () => import("@/components/sui/DAppKitClientProvider").then((m) => m.DAppKitClientProvider),
    { ssr: false },
);

export default function WalletProvider({ children }: { children: React.ReactNode }) {
    return <DAppKitClientProvider>{children}</DAppKitClientProvider>;
}