#[test_only]
module attest_docs::attest_docs_tests;

use attest_docs::attest_docs::{
    Self,
    DocumentProof,
    ENotRequiredSigner,
    ENotAdmin,
};
use sui::test_scenario as ts;

// Test addresses standing in for signers.
const ADMIN: address = @0xAD;
const LEGAL: address = @0x1E9A1;
const FINANCE: address = @0xF1;
const CEO: address = @0xCE0;
const NEW_CEO: address = @0xCE1;

// Helper: a fake envelope hash. A byte-string literal is already a vector<u8>.
fun envelope_a(): vector<u8> { b"envelope-hash-A" }
fun envelope_b(): vector<u8> { b"envelope-hash-B" }

#[test]
fun registers_document_as_pending() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            envelope_a(),
            vector[LEGAL, FINANCE, CEO],
            ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        assert!(!attest_docs::is_fully_signed(&proof), 0);
        assert!(attest_docs::signature_count(&proof) == 0, 1);
        assert!(attest_docs::required_count(&proof) == 3, 2);
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

#[test]
fun all_signers_reach_fully_signed() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            envelope_a(),
            vector[LEGAL, FINANCE, CEO],
            ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, LEGAL);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::sign(&mut proof, ts::ctx(&mut scenario));
        assert!(!attest_docs::is_fully_signed(&proof), 0);
        ts::return_shared(proof);
    };

    ts::next_tx(&mut scenario, FINANCE);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::sign(&mut proof, ts::ctx(&mut scenario));
        assert!(!attest_docs::is_fully_signed(&proof), 1);
        ts::return_shared(proof);
    };

    ts::next_tx(&mut scenario, CEO);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::sign(&mut proof, ts::ctx(&mut scenario));
        assert!(attest_docs::is_fully_signed(&proof), 2);
        assert!(attest_docs::signature_count(&proof) == 3, 3);
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ENotRequiredSigner)]
fun non_required_signer_cannot_sign() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            envelope_a(),
            vector[LEGAL, FINANCE, CEO],
            ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, NEW_CEO);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::sign(&mut proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

/// THE ACCEPTANCE CHECK, ON-CHAIN:
/// Legal signs. Before the doc is complete, the admin changes the required CEO.
/// The policy change must clear all prior signatures — so Legal's signature is
/// gone and the document is back to PENDING with 0 signatures.
#[test]
fun policy_change_clears_prior_signatures() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            envelope_a(),
            vector[LEGAL, FINANCE, CEO],
            ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, LEGAL);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::sign(&mut proof, ts::ctx(&mut scenario));
        assert!(attest_docs::signature_count(&proof) == 1, 0);
        ts::return_shared(proof);
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::update_policy(
            &mut proof,
            envelope_b(),
            vector[LEGAL, FINANCE, NEW_CEO],
            ts::ctx(&mut scenario),
        );
        assert!(attest_docs::signature_count(&proof) == 0, 1);
        assert!(!attest_docs::is_fully_signed(&proof), 2);
        assert!(attest_docs::envelope_hash(&proof) == envelope_b(), 3);
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

#[test]
#[expected_failure(abort_code = ENotAdmin)]
fun non_admin_cannot_update_policy() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            envelope_a(),
            vector[LEGAL, FINANCE, CEO],
            ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, LEGAL);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::update_policy(
            &mut proof,
            envelope_b(),
            vector[LEGAL],
            ts::ctx(&mut scenario),
        );
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

