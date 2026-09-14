"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * There is no separate registration step under wallet-native auth — signing
 * in for the first time with a given address IS registration. Anything that
 * still links here (old bookmarks, muscle memory) lands on /login instead of
 * a 404 or a dead form.
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
