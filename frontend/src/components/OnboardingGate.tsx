"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const ONBOARDING_PATH = "/onboarding/username";

/**
 * Forces every signed-in account with no username yet to the "choose your
 * username" step before it can reach anything else — dashboard, teams,
 * documents, all of it. This sits in the root layout (wrapping every page),
 * not inside RequireAuth, because the gate has to apply everywhere a
 * logged-in user might land, not just the pages that already opt into
 * RequireAuth.
 *
 * This is a UX affordance only, same as RequireAuth: every endpoint that
 * actually needs a username (e.g. adding a team member by one) still
 * enforces that server-side regardless of what the frontend does here.
 */
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const onOnboardingPage = pathname === ONBOARDING_PATH;
    const needsUsername = !loading && !!user && !user.username;

    useEffect(() => {
        if (needsUsername && !onOnboardingPage) {
            router.replace(ONBOARDING_PATH);
        }
    }, [needsUsername, onOnboardingPage, router]);

    // Blank instead of real content while the redirect is in flight — avoids
    // flashing a page the user is about to be bounced away from.
    if (needsUsername && !onOnboardingPage) {
        return null;
    }
    return <>{children}</>;
}
