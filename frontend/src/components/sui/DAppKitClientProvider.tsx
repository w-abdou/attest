"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/lib/dappKit";

export function DAppKitClientProvider({ children }: { children: React.ReactNode }) {
    return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}