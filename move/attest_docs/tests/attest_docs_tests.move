#[test_only]
module attest_docs::attest_docs_tests;

use attest_docs::attest_docs::{
    Self,
    DocumentProof,
    ENotRequiredSigner,
    ENotAdmin,
    ENotAuthorizedForDecryption,
    EWrongSealId,
    EDocumentRevoked,
};
use sui::test_scenario as ts;

// Test addresses standing in for signers.
const ADMIN: address = @0xAD;
const LEGAL: address = @0x1E9A1;
const FINANCE: address = @0xF1;
const CEO: address = @0xCE0;
const NEW_CEO: address = @0xCE1;
const OUTSIDER: address = @0x0B5;

// Helper: a fake envelope hash. A byte-string literal is already a vector<u8>.
fun envelope_a(): vector<u8> { b"envelope-hash-A" }
fun envelope_b(): vector<u8> { b"envelope-hash-B" }

// Helper: a fake Seal document id — in the real app this is derived from the
// Attest backend's numeric document id, but any fixed byte string works here.
fun doc_id(): vector<u8> { b"doc-42" }
fun other_doc_id(): vector<u8> { b"doc-99" }

#[test]
fun registers_document_as_pending() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            doc_id(),
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
        assert!(attest_docs::document_id(&proof) == doc_id(), 3);
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
            doc_id(),
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
            doc_id(),
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
            doc_id(),
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
            doc_id(),
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

// === seal_approve: this is the security-critical boundary Seal key servers
// rely on. Every one of these runs seal_approve exactly as a key server would
// (a call in a transaction from the requesting address) and checks whether it
// aborts or succeeds. ===

#[test]
fun admin_can_decrypt_even_with_no_signers_assigned() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(doc_id(), envelope_a(), vector[], ts::ctx(&mut scenario));
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::seal_approve(doc_id(), &proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

#[test]
fun required_signer_can_decrypt() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            doc_id(), envelope_a(), vector[LEGAL, FINANCE, CEO], ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, LEGAL);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::seal_approve(doc_id(), &proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

/// THE AUTHORIZATION-BOUNDARY ACCEPTANCE CHECK:
/// An address that is neither the admin nor a required signer must be denied
/// the decryption key — seal_approve must abort, not silently succeed.
#[test]
#[expected_failure(abort_code = ENotAuthorizedForDecryption)]
fun outsider_cannot_decrypt() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            doc_id(), envelope_a(), vector[LEGAL, FINANCE, CEO], ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, OUTSIDER);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::seal_approve(doc_id(), &proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

/// A required signer who was removed by a later policy change loses decrypt
/// access too — seal_approve reads the *current* required_signers, not the
/// set at encryption time.
#[test]
#[expected_failure(abort_code = ENotAuthorizedForDecryption)]
fun removed_signer_loses_decrypt_access_after_policy_change() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            doc_id(), envelope_a(), vector[LEGAL, FINANCE, CEO], ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::update_policy(&mut proof, envelope_b(), vector[FINANCE, NEW_CEO], ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::next_tx(&mut scenario, LEGAL);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::seal_approve(doc_id(), &proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

/// Requesting a key under the wrong id — even if you would otherwise be
/// authorized — must fail. This is what stops proof A from unlocking a blob
/// actually encrypted under a different document's identity.
#[test]
#[expected_failure(abort_code = EWrongSealId)]
fun wrong_seal_id_is_rejected() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            doc_id(), envelope_a(), vector[LEGAL, FINANCE, CEO], ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::seal_approve(other_doc_id(), &proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}

/// A revoked document cannot be decrypted even by its admin.
#[test]
#[expected_failure(abort_code = EDocumentRevoked)]
fun revoked_document_cannot_be_decrypted() {
    let mut scenario = ts::begin(ADMIN);

    ts::next_tx(&mut scenario, ADMIN);
    {
        attest_docs::register_document(
            doc_id(), envelope_a(), vector[LEGAL, FINANCE, CEO], ts::ctx(&mut scenario),
        );
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let mut proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::revoke_document(&mut proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::next_tx(&mut scenario, ADMIN);
    {
        let proof = ts::take_shared<DocumentProof>(&scenario);
        attest_docs::seal_approve(doc_id(), &proof, ts::ctx(&mut scenario));
        ts::return_shared(proof);
    };

    ts::end(scenario);
}
