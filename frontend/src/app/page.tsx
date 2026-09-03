"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/documents");
    }
  }, [loading, user, router]);

  if (loading || user) return null;

  return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Attest</h1>
        <p className="text-gray-600">
          Upload a document, fingerprint it with SHA-256, and verify later whether it
          has been modified.
        </p>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 bg-indigo-900 text-white rounded">
            Log in
          </Link>
          <Link
              href="/register"
              className="px-4 py-2 border border-indigo-900 text-indigo-900 rounded"
          >
            Register
          </Link>
        </div>
      </div>
  );
}