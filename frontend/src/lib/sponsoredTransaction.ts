import { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { dAppKit } from "@/lib/dappKit";
import { getSuiReadClient } from "@/lib/suiReadClient";

/**
 * One entry per Move call this app ever sponsors. The client names the
 * action, not the target — the actual target string is resolved server-side
 * (see app/api/sponsor-transaction/route.ts), so nothing running in the
 * browser can get this app's Enoki sponsor pool to pay gas for anything else.
 */
export type SponsoredAction = "register-document" | "sign";

class SponsorshipUnavailableError extends Error {}

async function requestSponsorship(
    action: SponsoredAction,
    sender: string,
    transactionKindBytes: string,
): Promise<{ bytes: string; digest: string }> {
    const res = await fetch("/api/sponsor-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionKindBytes, sender, action }),
    });
    if (res.status === 501) {
        throw new SponsorshipUnavailableError();
    }
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Could not sponsor this transaction (HTTP ${res.status}).`);
    }
    return res.json();
}

async function requestExecution(digest: string, signature: string): Promise<{ digest: string }> {
    const res = await fetch("/api/execute-sponsored-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digest, signature }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Could not execute the sponsored transaction (HTTP ${res.status}).`);
    }
    return res.json();
}

async function waitForEffects(digest: string) {
    const result = await getSuiReadClient().core.waitForTransaction({ digest, include: { effects: true } });
    if (result.$kind !== "Transaction") {
        throw new Error("The sponsored transaction failed after execution.");
    }
    return { digest: result.Transaction.digest, effects: result.Transaction.effects };
}

async function signAndExecuteDirectly(tx: Transaction) {
    // Same shape as before Enoki: the connected wallet pays its own gas. Used
    // as a fallback only, so register/sign still work while sponsorship is
    // being set up (ENOKI_SECRET_KEY not yet configured server-side) — see
    // docs/security-assessment.md "Sponsored transactions".
    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind !== "Transaction") {
        throw new Error("The transaction could not be executed on-chain.");
    }
    return { digest: result.Transaction.digest, effects: result.Transaction.effects };
}

/**
 * Signs and executes `tx` gas-sponsored by Enoki: the connected wallet
 * (Slush or Google/zkLogin — either way, whatever wallet-standard account is
 * currently connected) only ever signs, and pays no gas at all. Falls back
 * to the wallet paying its own gas if sponsorship isn't configured on this
 * deployment yet, so callers don't need their own fallback logic.
 */
export async function signAndExecuteSponsored(
    tx: Transaction,
    action: SponsoredAction,
    senderAddress: string,
) {
    let sponsorship: { bytes: string; digest: string };
    try {
        const kindBytes = await tx.build({ client: getSuiReadClient(), onlyTransactionKind: true });
        sponsorship = await requestSponsorship(action, senderAddress, toBase64(kindBytes));
    } catch (err) {
        if (err instanceof SponsorshipUnavailableError) {
            return signAndExecuteDirectly(tx);
        }
        throw err;
    }

    const { signature } = await dAppKit.signTransaction({ transaction: sponsorship.bytes });
    await requestExecution(sponsorship.digest, signature);

    return waitForEffects(sponsorship.digest);
}
