// On-chain configuration for the Attest Move package (Week 2 / 2.5).
// The package is deployed on Sui testnet; the source lives in move/attest_docs.
//
// If the package is ever re-published (new deployment), update PACKAGE_ID here.
// Kept in one place so no transaction-building code hardcodes the address.

export const ATTEST_PACKAGE_ID =
    "0xeb00a0e141a71b8a3b18f171d51a7f13ffcfa0b7752310552e4b434d30ab9ab3";

export const ATTEST_MODULE = "attest_docs";
export const ATTEST_NETWORK = "testnet" as const;

// Fully-qualified target strings for the entry functions we call.
export const TARGET = {
    registerDocument: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::register_document`,
    sign: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::sign`,
    updatePolicy: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::update_policy`,
    revokeDocument: `${ATTEST_PACKAGE_ID}::${ATTEST_MODULE}::revoke_document`,
} as const;