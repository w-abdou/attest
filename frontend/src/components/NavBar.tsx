"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function NavBar() {
    const { user, logout, loading } = useAuth();

    if (loading) return null;

    return (
        <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <Link href="/" className="font-semibold text-lg text-indigo-900">
                Attest
            </Link>
            <div className="flex items-center gap-4 text-sm">
                {user ? (
                    <>
                        <Link href="/documents" className="text-gray-700 hover:text-indigo-900">
                            Documents
                        </Link>
                        {user.role === "ADMIN" && (
                            <Link href="/admin" className="text-gray-700 hover:text-indigo-900">
                                Admin
                            </Link>
                        )}
                        <span className="text-gray-500">
              {user.email} ({user.role})
            </span>
                        <button
                            onClick={logout}
                            className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800"
                        >
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="text-gray-700 hover:text-indigo-900">
                            Log in
                        </Link>
                        <Link href="/register" className="text-gray-700 hover:text-indigo-900">
                            Register
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}