"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SkeletonRows } from "./ui/Skeleton";
import type { Role } from "@/lib/api";

/**
 * Client-side route guard. This is a UX affordance only — every endpoint is
 * independently authorized on the server from the JWT, so a user who forces
 * their way to a page still gets 403s from the API.
 */
export default function RequireAuth({
  role, children,
}: { role?: Role; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const denied = !loading && (!user || (role !== undefined && user.role !== role));

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (role !== undefined && user.role !== role) router.replace("/dashboard");
  }, [loading, user, role, router]);

  if (loading || denied) {
    return (
      <div className="rounded-xl border border-ink-200 bg-white">
        <SkeletonRows rows={3} />
      </div>
    );
  }
  return <>{children}</>;
}
