import { Transaction } from "@mysten/sui/transactions";
import { dAppKit } from "@/lib/dappKit";
import { TARGET } from "@/lib/attestContract";

export interface SignResult {
    txDigest: string;
    signerAddress: string;
}

/**
 * Builds and executes sign(proof) on Sui, signed by the connected wallet.
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

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    if (result.$kind !== "Transaction") {
        throw new Error("The signing transaction could not be executed on-chain.");
    }
    const { digest: txDigest, effects } = result.Transaction;
    if (!effects.status.success) {
        throw new Error(`On-chain signing was rejected: ${effects.status.error ?? "unknown Move abort"}`);
    }

    return { txDigest, signerAddress };
}