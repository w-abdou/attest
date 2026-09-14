// On-chain configuration for the Attest Move package (Week 2 / 2.5, redeployed
// for Seal in Week 2 / 2.3 final slice). The package is deployed on Sui
// testnet; the source lives in move/attest_docs.
//
// If the package is ever re-published (new deployment), update PACKAGE_ID
// here. Kept in one place so no transaction-building code hardcodes the
// address. NOTE: redeploying changes this id, which invalidates every
// previously-registered DocumentProof (they live under the OLD package id) —
// a document registered before this redeploy must be re-registered under the
// new package before Seal decryption (or anything else calling into the new
// package) works for it. See docs/security-assessment.md "Seal access
// control" for the redeploy history.
//
// Redeployed 2026-09-14 to add document_id + seal_approve for Seal access
// control. Previous package id (pre-Seal): eb00a0e141a71b8a3b18f171d51a7f13ffcfa0b7752310552e4b434d30ab9ab3

export const ATTEST_PACKAGE_ID =
    "0x5ab9e52d5026189cfe94735896d6cb7b49748fceb78dc882060b724e2bafa3b7";

export const ATTEST_MODULE = "attest_docs";
export const ATTEST_NETWORK = "testnet" as const;

// Fully-qualified target strings for the entry functions we call.
export const TARGET = {
    registerDocument: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::register_document`,
    sign: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::sign`,
    updatePolicy: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::update_policy`,
    revokeDocument: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::revoke_document`,
    sealApprove: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::seal_approve`,
} as const;
