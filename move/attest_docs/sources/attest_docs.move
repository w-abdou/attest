/// Attest — on-chain document signing proof (Week 2 / 2.5) and Seal access
/// control (Week 2 / 2.3, final slice).
///
/// Each document is a shared `DocumentProof` object anchoring the envelopeHash
/// that the Attest backend computed off-chain. Assigned signers submit
/// signatures; when all required signers have signed, the document is FULLY_SIGNED.
///
/// The policy binding: if the admin changes the required signers (update_policy),
/// all previously collected signatures are cleared and the envelopeHash is
/// replaced. A signature therefore never survives a policy change — matching the
/// Week 2 acceptance check (swap the required CEO, and the earlier Legal
/// signature no longer counts).
///
/// `seal_approve` is this same object's second job: it is the Seal access
/// policy that gates who can obtain the decryption key for the document's
/// Walrus-stored ciphertext. A document's Seal identity (`document_id`) is
/// chosen client-side at upload time (before the document is ever registered
/// on-chain) and is carried into `register_document` unchanged — Seal
/// encryption itself needs no on-chain object to exist yet, but decryption
/// does: until a document is registered, its `DocumentProof` does not exist,
/// there is nothing for `seal_approve` to check, and no one (not even the
/// uploader) can decrypt it. See docs/security-assessment.md "Seal access
/// control" for the full design rationale and its limits (identity- and
/// signer-based authorization only — there is no on-chain team roster, so
/// "team member" access control would require a much larger, separate change).
module attest_docs::attest_docs;

use sui::event;
use sui::vec_map::{Self, VecMap};

// === Errors ===

const ENotAdmin: u64 = 0;
const ENotRequiredSigner: u64 = 1;
const EAlreadySigned: u64 = 2;
const EDocumentRevoked: u64 = 3;
const ENotAuthorizedForDecryption: u64 = 4;
const EWrongSealId: u64 = 5;

// === Status constants ===

const STATUS_PENDING: u8 = 0;
const STATUS_FULLY_SIGNED: u8 = 1;
const STATUS_REVOKED: u8 = 2;

// === Structs ===

/// A shared object representing one document's on-chain signing state.
public struct DocumentProof has key {
    id: UID,
    /// The Seal identity this document's ciphertext was encrypted under —
    /// chosen client-side at upload time (before this object even exists),
    /// and fixed for this document's lifetime. `seal_approve` only releases a
    /// decryption key for the exact id it was asked about if it matches this.
    document_id: vector<u8>,
    /// The envelope hash computed off-chain by the Attest backend (the anchor).
    envelope_hash: vector<u8>,
    /// Sui addresses that must sign this document.
    required_signers: vector<address>,
    /// Which required signers have signed so far (address -> true).
    signatures: VecMap<address, bool>,
    /// PENDING / FULLY_SIGNED / REVOKED.
    status: u8,
    /// The address allowed to change the policy or revoke. Also authorized to
    /// decrypt via seal_approve, even before any signers are assigned.
    admin: address,
}

// === Events ===

public struct DocumentRegistered has copy, drop {
    document_id: ID,
    envelope_hash: vector<u8>,
    required_signers: vector<address>,
}

public struct SignatureSubmitted has copy, drop {
    document_id: ID,
    signer: address,
    fully_signed: bool,
}

public struct PolicyUpdated has copy, drop {
    document_id: ID,
    new_envelope_hash: vector<u8>,
    new_required_signers: vector<address>,
}

public struct DocumentRevoked has copy, drop {
    document_id: ID,
}

// === Public functions ===

/// Register a new document on-chain. The caller becomes its admin.
/// Creates a shared DocumentProof and emits DocumentRegistered.
///
/// `document_id` is the Seal identity the browser already encrypted this
/// document's Walrus blob under (see module docs) — it is opaque to this
/// module beyond being stored verbatim and compared against in seal_approve.
public fun register_document(
    document_id: vector<u8>,
    envelope_hash: vector<u8>,
    required_signers: vector<address>,
    ctx: &mut TxContext,
) {
    let proof = DocumentProof {
        id: object::new(ctx),
        document_id,
        envelope_hash,
        required_signers,
        signatures: vec_map::empty(),
        status: STATUS_PENDING,
        admin: ctx.sender(),
    };

    event::emit(DocumentRegistered {
        document_id: object::id(&proof),
        envelope_hash: proof.envelope_hash,
        required_signers: proof.required_signers,
    });

    transfer::share_object(proof);
}

/// Submit a signature. The caller must be one of the required signers and must
/// not have already signed. When every required signer has signed, the document
/// becomes FULLY_SIGNED.
public fun sign(proof: &mut DocumentProof, ctx: &TxContext) {
    assert!(proof.status != STATUS_REVOKED, EDocumentRevoked);

    let signer_addr = ctx.sender();
    assert!(is_required_signer(proof, signer_addr), ENotRequiredSigner);
    assert!(!proof.signatures.contains(&signer_addr), EAlreadySigned);

    proof.signatures.insert(signer_addr, true);

    let fully_signed = proof.signatures.length() == proof.required_signers.length();
    if (fully_signed) {
        proof.status = STATUS_FULLY_SIGNED;
    };

    event::emit(SignatureSubmitted {
        document_id: object::id(proof),
        signer: signer_addr,
        fully_signed,
    });
}

/// Admin-only. Replace the required signers and envelope hash, and clear all
/// collected signatures. This is what makes a policy change invalidate prior
/// signatures on-chain.
public fun update_policy(
    proof: &mut DocumentProof,
    new_envelope_hash: vector<u8>,
    new_required_signers: vector<address>,
    ctx: &TxContext,
) {
    assert!(proof.status != STATUS_REVOKED, EDocumentRevoked);
    assert!(ctx.sender() == proof.admin, ENotAdmin);

    proof.envelope_hash = new_envelope_hash;
    proof.required_signers = new_required_signers;
    proof.signatures = vec_map::empty(); // clear all prior signatures
    proof.status = STATUS_PENDING;

    event::emit(PolicyUpdated {
        document_id: object::id(proof),
        new_envelope_hash: proof.envelope_hash,
        new_required_signers: proof.required_signers,
    });
}

/// Admin-only. Mark the document revoked. Historical proof remains on-chain,
/// but no further signing is possible.
public fun revoke_document(proof: &mut DocumentProof, ctx: &TxContext) {
    assert!(ctx.sender() == proof.admin, ENotAdmin);
    proof.status = STATUS_REVOKED;
    event::emit(DocumentRevoked { document_id: object::id(proof) });
}

// === Seal access control ===

/// Seal calls this (via a dry-run transaction, never actually executed or
/// committed) whenever some address asks a key server to release the
/// decryption key for `id`. It must abort — not return false — to deny
/// access, and must never modify state or depend on non-deterministic
/// input (see the Seal docs' `seal_approve*` guidelines).
///
/// Authorization: the document's admin (the uploader) or any of its current
/// required signers may decrypt. There is no on-chain team roster in this
/// package, so broader "team member" access is not something this policy can
/// express — only identities that already appear on this exact DocumentProof.
public(package) entry fun seal_approve(id: vector<u8>, proof: &DocumentProof, ctx: &TxContext) {
    assert!(id == proof.document_id, EWrongSealId);
    assert!(proof.status != STATUS_REVOKED, EDocumentRevoked);

    let caller = ctx.sender();
    assert!(caller == proof.admin || is_required_signer(proof, caller), ENotAuthorizedForDecryption);
}

// === View functions ===

public fun status(proof: &DocumentProof): u8 {
    proof.status
}

public fun document_id(proof: &DocumentProof): vector<u8> {
    proof.document_id
}

public fun envelope_hash(proof: &DocumentProof): vector<u8> {
    proof.envelope_hash
}

public fun signature_count(proof: &DocumentProof): u64 {
    proof.signatures.length()}

public fun required_count(proof: &DocumentProof): u64 {
    proof.required_signers.length()
}

public fun is_fully_signed(proof: &DocumentProof): bool {
    proof.status == STATUS_FULLY_SIGNED
}

// === Internal helpers ===

fun is_required_signer(proof: &DocumentProof, addr: address): bool {
    let mut i = 0;
    let n = proof.required_signers.length();
    while (i < n) {
        if (proof.required_signers[i] == addr) {
            return true
        };
        i = i + 1;
    };
    false
}