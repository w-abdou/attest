"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, ReactNode } from "react";
import * as api from "@/lib/api";
import type { Role } from "@/lib/api";

export type WalletKind = "slush" | "google";

interface AuthUser {
    id: number;
    email: string | null;
    suiAddress: string;
    role: Role;
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    /**
     * The whole login (and, for a brand-new address, account creation) flow:
     * connect the chosen wallet, have it sign a fresh server-issued challenge,
     * and hand the signature to the backend to verify. Throws on any step's
     * failure — the caller decides how to present that.
     */
    loginWithWallet: (kind: WalletKind) => Promise<void>;
    logout: () => void;
}

const TOKEN_KEY = "attest_token";
const USER_KEY = "attest_user";

const WALLET_NAME_PATTERN: Record<WalletKind, RegExp> = {
    slush: /slush/i,
    google: /google/i,
};

/* ---------------------------------------------------------------------------
   localStorage is an external store, so it is read through useSyncExternalStore
   rather than copied into React state by an effect. Two consequences worth
   knowing: the parsed user is memoised against its raw string (getSnapshot has
   to stay referentially stable or React re-renders forever), and a "storage"
   listener keeps other tabs in sync — logging out in one tab logs out the rest.
--------------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedUser: AuthUser | null = null;

function emit() {
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // The storage event only fires in *other* tabs, so local writes call emit()
    // themselves. Repeated addEventListener with the same function is a no-op.
    window.addEventListener("storage", emit);
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) window.removeEventListener("storage", emit);
    };
}

function getUserSnapshot(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (raw !== cachedRaw) {
        cachedRaw = raw;
        try {
            cachedUser = raw ? (JSON.parse(raw) as AuthUser) : null;
        } catch {
            cachedUser = null; // Corrupt entry — treat it as logged out.
        }
    }
    return cachedUser;
}

// The server has no localStorage, so it renders the logged-out shell and React
// swaps in the real value during hydration.
const getServerUserSnapshot = (): AuthUser | null => null;
const alwaysTrue = () => true;
const alwaysFalse = () => false;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const user = useSyncExternalStore(subscribe, getUserSnapshot, getServerUserSnapshot);
    // False until hydration completes, which is what lets the UI show a
    // placeholder instead of flashing the logged-out navigation.
    const hydrated = useSyncExternalStore(subscribe, alwaysTrue, alwaysFalse);

    const loginWithWallet = useCallback(async (kind: WalletKind) => {
        // Imported dynamically, not at module scope: dappKit.ts's own module-level
        // createDAppKit() call is documented as browser-only, and AuthProvider sits
        // at the root layout with no ssr:false boundary — every page (including
        // ones with no wallet UI at all) would otherwise evaluate it during static
        // generation, which is exactly what "Skipping wallet initializer" during
        // `next build` was — a benign but real sign this file broke that invariant.
        const { dAppKit } = await import("@/lib/dappKit");

        const pattern = WALLET_NAME_PATTERN[kind];
        const wallet = dAppKit.stores.$wallets.get().find((w) => pattern.test(w.name));
        if (!wallet) {
            throw new Error(
                kind === "slush"
                    ? "Slush wallet was not detected. Install the Slush browser extension and try again."
                    : "Google sign-in is not available right now. Please try again shortly.",
            );
        }

        // connectWallet is the only step that can prompt the user (extension
        // popup, or the Google OAuth pop-up for the Enoki wallet). Once
        // connected, dApp Kit persists this to localStorage (see dappKit.ts),
        // so this prompt is a one-time cost, not something later signing or
        // uploading needs to repeat.
        const { accounts } = await dAppKit.connectWallet({ wallet });
        const account = accounts[0];
        if (!account) {
            throw new Error("The wallet did not return an account to sign in with.");
        }

        const challenge = await api.getWalletChallenge();
        const { signature } = await dAppKit.signPersonalMessage({
            account,
            message: new TextEncoder().encode(challenge.message),
        });

        const result = await api.verifyWalletSignature(challenge.nonce, account.address, signature);
        if (!result.suiAddress) {
            // Structurally impossible — verify always finds-or-creates a user by
            // address — but never silently trust an assumption in an auth path.
            throw new Error("Sign-in succeeded but the server did not return an address.");
        }

        const authUser: AuthUser = {
            id: result.id, email: result.email, suiAddress: result.suiAddress, role: result.role,
        };
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        emit();
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        // Also forget the connected wallet, so logging out really logs out —
        // otherwise autoConnect would silently reconnect the same account.
        localStorage.removeItem("attest_dappkit");
        emit();

        // Dynamically imported for the same reason as in loginWithWallet — this
        // runs after emit() so the UI reflects "logged out" immediately, without
        // waiting on the wallet module to load.
        import("@/lib/dappKit").then(({ dAppKit }) => dAppKit.disconnectWallet()).catch(() => {
            /* already disconnected, or nothing was connected — fine either way */
        });
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ user, loading: !hydrated, loginWithWallet, logout }),
        [user, hydrated, loginWithWallet, logout],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
}
