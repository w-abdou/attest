"use client";

import { useCurrentAccount, useCurrentNetwork, useWallets, useDAppKit } from "@mysten/dapp-kit-react";
import { GoogleGlyph, SlushGlyph } from "@/components/ui/Icons";

function shortAddress(addr: string) {
    return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

/**
 * Read-only view of the wallet backing the current session, plus disconnect.
 * There is no separate "link this wallet" action any more — under wallet-native
 * auth the connected wallet IS how you signed in, not something attached to an
 * account after the fact (see AuthContext.loginWithWallet).
 */
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
                    Not connected right now. If you are signed in to Attest, reconnecting here
                    restores the same wallet your session is using — it does not start a new
                    sign-in.
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
            <p className="text-xs text-ink-500">
                Disconnecting here does not sign you out of Attest, but every action that needs
                your wallet — signing a document, registering one on-chain — will ask you to
                reconnect until you do.
            </p>
        </div>
    );
}

export function WalletPanel() {
    return <WalletControls />;
}
