"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem("attest_token");
        const storedUser = localStorage.getItem("attest_user");
        if (storedToken && storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    async function login(email: string, password: string) {
        const result = await api.login(email, password);
        const authUser: AuthUser = { id: result.id, email: result.email, role: result.role };
        localStorage.setItem("attest_token", result.token);
        localStorage.setItem("attest_user", JSON.stringify(authUser));
        setUser(authUser);
    }

    async function register(email: string, password: string) {
        await api.register(email, password);
        // Registration always returns a VIEWER account — log the person straight in
        // afterward instead of making them re-type their credentials.
        await login(email, password);
    }

    function logout() {
        localStorage.removeItem("attest_token");
        localStorage.removeItem("attest_user");
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
}