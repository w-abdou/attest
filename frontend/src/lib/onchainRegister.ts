import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import { dAppKit } from "@/lib/dappKit";
import { TARGET, ATTEST_PACKAGE_ID, ATTEST_NETWORK } from "@/lib/attestContract";
import { sealIdHex } from "@/lib/sealId";

export interface RegisterResult {
    objectId: string;
    txDigest: string;
    packageId: string;
    network: string;
}

export async function registerDocumentOnChain(
    documentId: number,
    envelopeHashHex: string,
    signerAddresses: string[],
): Promise<RegisterResult> {
    // The Move function wants vector<u8>. Convert the hex envelope hash to bytes.
    const hex = envelopeHashHex.startsWith("0x") ? envelopeHashHex.slice(2) : envelopeHashHex;
    const envelopeBytes = fromHex(hex);
    // Same identity this document was (or will be) Seal-encrypted under —
    // stored on-chain so seal_approve can check requests against it later.
    const documentIdBytes = fromHex(sealIdHex(documentId));

    const tx = new Transaction();
    tx.moveCall({
        target: TARGET.registerDocument,
        arguments: [
            tx.pure.vector("u8", Array.from(documentIdBytes)),
            tx.pure.vector("u8", Array.from(envelopeBytes)),
            tx.pure.vector("address", signerAddresses),
        ],
    });

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });

    // @mysten/dapp-kit-react's signAndExecuteTransaction always requests
    // { effects: true, transaction: true, bcs: true } — it does not expose an
    // objectTypes include, so we cannot match the created object by Move type
    // string here. Instead: the transaction either failed outright ($kind is
    // "FailedTransaction"), aborted on-chain (executed but status.success is
    // false — e.g. a Move assertion in register_document), or succeeded, in
    // which case register_document creates exactly one shared object, so the
    // single "Created" entry in changedObjects is the DocumentProof.
    if (result.$kind !== "Transaction") {
        throw new Error("The transaction could not be executed on-chain.");
    }

    const { digest: txDigest, effects } = result.Transaction;

    if (!effects.status.success) {
        throw new Error(`On-chain registration was rejected: ${effects.status.error ?? "unknown Move abort"}`);
    }

    const created = effects.changedObjects.filter((o) => o.idOperation === "Created");
    if (created.length === 0) {
        throw new Error("Registered on-chain, but no created object was found in the transaction effects.");
    }
    if (created.length > 1) {
        throw new Error("Registered on-chain, but more than one object was created — the document proof object is ambiguous.");
    }

    return { objectId: created[0].objectId, txDigest, packageId: ATTEST_PACKAGE_ID, network: ATTEST_NETWORK };
}