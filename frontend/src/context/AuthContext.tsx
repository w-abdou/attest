"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, ReactNode } from "react";
import * as api from "@/lib/api";
import type { Role } from "@/lib/api";

interface AuthUser {
    id: number;
    email: string;
    role: Role;
}

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const TOKEN_KEY = "attest_token";
const USER_KEY = "attest_user";

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

    const login = useCallback(async (email: string, password: string) => {
        const result = await api.login(email, password);
        const authUser: AuthUser = { id: result.id, email: result.email, role: result.role };
        localStorage.setItem(TOKEN_KEY, result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(authUser));
        emit();
    }, []);

    const register = useCallback(async (email: string, password: string) => {
        await api.register(email, password);
        // Registration always returns a VIEWER account — log the person straight in
        // afterward instead of making them re-type their credentials.
        await login(email, password);
    }, [login]);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        emit();
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ user, loading: !hydrated, login, register, logout }),
        [user, hydrated, login, register, logout],
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
