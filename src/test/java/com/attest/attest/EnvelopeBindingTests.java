package com.attest.attest;

import com.attest.attest.model.Document;
import com.attest.attest.service.EnvelopeService;
import com.attest.attest.service.HashService;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class EnvelopeBindingTests {

    private final EnvelopeService envelope = new EnvelopeService(new HashService());

    private Document docWith(Long id, String hash, int version) {
        Document d = new Document();
        d.setId(id);
        d.setDocumentHash(hash);
        d.setVersion(version);
        return d;
    }

    @Test
    void policyHashIsOrderIndependent() {
        assertEquals(
                envelope.computePolicyHash(List.of(1L, 2L, 3L)),
                envelope.computePolicyHash(List.of(3L, 1L, 2L)),
                "Signer order must not change the policy hash");
    }

    @Test
    void changingSignerSetChangesPolicyHash() {
        String before = envelope.computePolicyHash(List.of(1L, 2L, 3L));
        String after = envelope.computePolicyHash(List.of(1L, 2L, 4L)); // CEO swapped
        assertNotEquals(before, after, "Changing a required signer must change the policy hash");
    }

    @Test
    void envelopeHashChangesWhenPolicyChanges_invalidatingOldSignatures() {
        // A document with an initial policy (signers 1,2,3).
        Document doc = docWith(10L, "abc123", 1);
        envelope.applyEnvelope(doc, List.of(1L, 2L, 3L));
        String envelopeWhenLegalSigned = doc.getEnvelopeHash();
        assertNotNull(envelopeWhenLegalSigned);

        // Legal (signer 1) signs, binding to that envelope. Simulated by capturing it.
        String legalSignatureEnvelope = envelopeWhenLegalSigned;

        // Admin swaps the required CEO (3 -> 4) before Finance signs.
        envelope.applyEnvelope(doc, List.of(1L, 2L, 4L));
        String newEnvelope = doc.getEnvelopeHash();

        // The envelope changed, so Legal's signature no longer matches — it's stale.
        assertNotEquals(legalSignatureEnvelope, newEnvelope,
                "After the policy changes, a previously collected signature must no longer match the envelope");
    }

    @Test
    void emptySignerSetClearsEnvelope() {
        Document doc = docWith(5L, "hash", 1);
        envelope.applyEnvelope(doc, List.of(1L));
        assertNotNull(doc.getEnvelopeHash());
        envelope.applyEnvelope(doc, List.of());
        assertNull(doc.getPolicyHash());
        assertNull(doc.getEnvelopeHash());
    }
}