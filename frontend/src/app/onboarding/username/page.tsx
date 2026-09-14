"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Wordmark } from "@/components/NavBar";
import UsernameForm from "@/components/UsernameForm";

/**
 * The forced step between "wallet proved who you are" and "you can use
 * Attest" — OnboardingGate (root layout) is what actually routes every
 * signed-in, username-less account here, from anywhere in the app.
 */
export default function ChooseUsernamePage() {
    const { user, loading, setLocalUsername } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;
        if (!user) {
            router.replace("/login");
        } else if (user.username) {
            // Already done — nothing left to force here.
            router.replace("/dashboard");
        }
    }, [loading, user, router]);

    if (loading || !user || user.username) {
        return null;
    }

    return (
        <div className="animate-fade-in mx-auto max-w-sm py-8">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <Wordmark />
                <div>
                    <h1 className="text-xl font-semibold tracking-tight text-ink-950">Choose your username</h1>
                    <p className="mt-1 text-sm text-ink-500">
                        This is how teammates will find and invite you — it&apos;s the last step before
                        you can use Attest.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
                <UsernameForm
                    submitLabel="Continue"
                    submittingLabel="Saving…"
                    onSubmitted={(username) => {
                        setLocalUsername(username);
                        router.replace("/dashboard");
                    }}
                />
            </div>
        </div>
    );
}
