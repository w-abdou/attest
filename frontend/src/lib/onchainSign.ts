import { Transaction } from "@mysten/sui/transactions";
import { TARGET } from "@/lib/attestContract";
import { signAndExecuteSponsored } from "@/lib/sponsoredTransaction";

export interface SignResult {
    txDigest: string;
    signerAddress: string;
}

/**
 * Builds and executes sign(proof) on Sui, signed by the connected wallet and
 * gas-sponsored by Enoki (see lib/sponsoredTransaction.ts) — the signer never
 * pays gas, only signs.
 * onchainObjectId: the document's DocumentProof shared-object id (from registration).
 * signerAddress: the connected wallet's address (recorded as the on-chain signer).
 */
export async function signDocumentOnChain(
    onchainObjectId: string,
    signerAddress: string,
): Promise<SignResult> {
    const tx = new Transaction();
    tx.moveCall({
        target: TARGET.sign,
        arguments: [tx.object(onchainObjectId)],
    });

    const { digest: txDigest, effects } = await signAndExecuteSponsored(tx, "sign", signerAddress);

    if (!effects.status.success) {
        throw new Error(`On-chain signing was rejected: ${effects.status.error ?? "unknown Move abort"}`);
    }

    return { txDigest, signerAddress };
}
