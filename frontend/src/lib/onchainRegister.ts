import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { TARGET, ATTEST_PACKAGE_ID, ATTEST_NETWORK } from "@/lib/attestContract";
import { signAndExecuteSponsored } from "@/lib/sponsoredTransaction";

export interface RegisterResult {
    objectId: string;
    txDigest: string;
    packageId: string;
    network: string;
}

/**
 * documentIdHex: the same Seal identity the document was (or, for a
 * non-Seal document, arbitrarily) already assigned — see lib/sealId.ts. It
 * has to be provided, not derived here, since for a Seal-encrypted document
 * it was already baked into the ciphertext before this ever runs.
 *
 * senderAddress: the connected wallet's address — gas-sponsored by Enoki, so
 * it only ever signs (see lib/sponsoredTransaction.ts); this account still
 * becomes the DocumentProof's admin on-chain, exactly as before.
 */
export async function registerDocumentOnChain(
    documentIdHex: string,
    envelopeHashHex: string,
    signerAddresses: string[],
    senderAddress: string,
): Promise<RegisterResult> {
    // The Move function wants vector<u8>. Convert the hex envelope hash to bytes.
    const hex = envelopeHashHex.startsWith("0x") ? envelopeHashHex.slice(2) : envelopeHashHex;
    const envelopeBytes = fromHex(hex);
    const documentIdBytes = fromHex(documentIdHex);

    const tx = new Transaction();
    tx.moveCall({
        target: TARGET.registerDocument,
        arguments: [
            tx.pure.vector("u8", Array.from(documentIdBytes)),
            tx.pure.vector("u8", Array.from(envelopeBytes)),
            tx.pure.vector("address", signerAddresses),
        ],
    });

    const { digest: txDigest, effects } = await signAndExecuteSponsored(tx, "register-document", senderAddress);

    if (!effects.status.success) {
        throw new Error(`On-chain registration was rejected: ${effects.status.error ?? "unknown Move abort"}`);
    }

    // register_document creates exactly one shared object (the
    // DocumentProof), so the single "Created" entry in changedObjects is it.
    const created = effects.changedObjects.filter((o) => o.idOperation === "Created");
    if (created.length === 0) {
        throw new Error("Registered on-chain, but no created object was found in the transaction effects.");
    }
    if (created.length > 1) {
        throw new Error("Registered on-chain, but more than one object was created — the document proof object is ambiguous.");
    }

    return { objectId: created[0].objectId, txDigest, packageId: ATTEST_PACKAGE_ID, network: ATTEST_NETWORK };
}
