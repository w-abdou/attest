"use client";

import { DAppKitProvider, useCurrentAccount, useCurrentNetwork, useWallets, useDAppKit } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/lib/dappKit";

function shortAddress(addr: string) {
    return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function WalletControls() {
    const account = useCurrentAccount();
    const network = useCurrentNetwork();
    const wallets = useWallets();
    const dAppKit = useDAppKit();

    const googleWallet = wallets.find((w) => /google/i.test(w.name));
    const slushWallet = wallets.find((w) => /slush/i.test(w.name));
    const extensionWallet = slushWallet ?? wallets.find((w) => !/google/i.test(w.name));

    async function connect(wallet: (typeof wallets)[number] | undefined) {
        if (!wallet) return;
        try {
            await dAppKit.connectWallet({ wallet });
        } catch {
            /* user closed the prompt */
        }
    }

    async function disconnect() {
        try {
            await dAppKit.disconnectWallet();
        } catch {
            /* already disconnected */
        }
    }

    if (!account) {
        return (
            <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => connect(extensionWallet)}
                        disabled={!extensionWallet}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-sui-600 px-4 text-sm font-medium text-white shadow-sm shadow-sui-600/30 transition-colors hover:bg-sui-700 disabled:opacity-50"
                    >
                        <SlushGlyph />
                        Connect Slush
                    </button>
                    <button
                        onClick={() => connect(googleWallet)}
                        disabled={!googleWallet}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-ink-300 bg-white px-4 text-sm font-medium text-ink-700 shadow-sm transition-colors hover:bg-ink-50 disabled:opacity-50"
                    >
                        <GoogleGlyph />
                        Continue with Google
                    </button>
                </div>
                <p className="text-sm text-ink-500">
                    Connect the Slush browser extension, or use Google sign-in (zkLogin) — no seed
                    phrase required. This is how you&apos;ll sign in future versions of Attest.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-ink-200 bg-white p-5">
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
                            <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Wallet</p>
                            <p className="text-sm text-ink-900">{account.label}</p>
                        </div>
                    )}
                </div>
            </div>
            <button
                onClick={disconnect}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink-300 px-3 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-50"
            >
                Disconnect {shortAddress(account.address)}
            </button>
        </div>
    );
}

function GoogleGlyph() {
    return (
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
    );
}

function SlushGlyph() {
    return (
        <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-white" aria-hidden="true">
      <svg width="11" height="11" viewBox="0 0 24 24">
        <path
            fill="#4DA2FF"
            d="M12 2.5c2.9 3.6 6.5 7.3 6.5 11.2A6.5 6.5 0 0 1 12 20.5a6.5 6.5 0 0 1-6.5-6.8C5.5 9.8 9.1 6.1 12 2.5z"
        />
      </svg>
    </span>
    );
}

export function WalletPanel() {
    return (
        <DAppKitProvider dAppKit={dAppKit}>
            <WalletControls />
        </DAppKitProvider>
    );
}