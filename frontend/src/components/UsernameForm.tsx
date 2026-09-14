"use client";

import { useEffect, useRef, useState } from "react";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { CheckCircleIcon } from "@/components/ui/Icons";

const AVAILABILITY_DEBOUNCE_MS = 400;

/** Same rule the backend enforces — checked client-side first purely for fast feedback. */
const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

type AvailabilityState =
    | { status: "idle" }
    | { status: "checking" }
    | { status: "available" }
    | { status: "unavailable"; reason: string };

interface UsernameFormProps {
    /** Shown while checking your own current username — never flags it as taken. */
    currentUsername?: string | null;
    submitLabel: string;
    submittingLabel: string;
    onSubmitted: (username: string) => void;
}

export default function UsernameForm({
    currentUsername, submitLabel, submittingLabel, onSubmitted,
}: UsernameFormProps) {
    const [value, setValue] = useState("");
    // Only ever set from the debounced async check below — the synchronous
    // idle/invalid-format cases are derived directly at render time instead,
    // so this effect never calls setState on its very first (synchronous) run.
    const [remoteStatus, setRemoteStatus] = useState<AvailabilityState>({ status: "idle" });
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestIdRef = useRef(0);

    const normalized = value.trim().toLowerCase();
    const formatValid = USERNAME_PATTERN.test(normalized);
    const isCurrentUsername = currentUsername != null && normalized === currentUsername.toLowerCase();

    const availability: AvailabilityState = !value
        ? { status: "idle" }
        : !formatValid
        ? {
              status: "unavailable",
              reason: "3–30 characters: lowercase letters, numbers, and underscores only.",
          }
        : remoteStatus;

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!value || !formatValid) {
            requestIdRef.current++; // Invalidate any in-flight check.
            return;
        }

        const requestId = ++requestIdRef.current;
        debounceRef.current = setTimeout(async () => {
            setRemoteStatus({ status: "checking" });
            try {
                const result = await api.checkUsernameAvailability(normalized);
                if (requestIdRef.current !== requestId) return; // A newer keystroke already superseded this check.
                setRemoteStatus(
                    result.available
                        ? { status: "available" }
                        : { status: "unavailable", reason: result.reason ?? "That username is taken." },
                );
            } catch {
                if (requestIdRef.current !== requestId) return;
                setRemoteStatus({ status: "unavailable", reason: "Could not check availability. Try again." });
            }
        }, AVAILABILITY_DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [normalized, formatValid, value]);

    const canSubmit =
        formatValid && !submitting && (isCurrentUsername || availability.status === "available");

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setSubmitError(null);
        try {
            const updated = await api.setUsername(normalized);
            onSubmitted(updated.username ?? normalized);
        } catch (err) {
            setSubmitError(err instanceof ApiError ? err.message : "Could not set your username. Try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3">
            <div>
                <Input
                    label="Username"
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="e.g. legal_lead"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    maxLength={30}
                    error={availability.status === "unavailable" && !isCurrentUsername ? availability.reason : null}
                    hint={
                        availability.status === "unavailable" && !isCurrentUsername
                            ? undefined
                            : "3–30 characters: lowercase letters, numbers, and underscores only."
                    }
                />
                {value && formatValid && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs">
                        {isCurrentUsername ? (
                            <span className="text-ink-500">This is already your username.</span>
                        ) : availability.status === "checking" ? (
                            <span className="text-ink-400">Checking availability…</span>
                        ) : availability.status === "available" ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                                <CheckCircleIcon className="text-sm" /> @{normalized} is available
                            </span>
                        ) : null}
                    </p>
                )}
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <Button type="submit" fullWidth loading={submitting} disabled={!canSubmit}>
                {submitting ? submittingLabel : submitLabel}
            </Button>
        </form>
    );
}
