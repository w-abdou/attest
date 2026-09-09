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
                envelope.computePolicyHash(List.of(3L, 1L, 2L)));
    }

    @Test
    void changingSignerSetChangesPolicyHash() {
        String before = envelope.computePolicyHash(List.of(1L, 2L, 3L));
        String after = envelope.computePolicyHash(List.of(1L, 2L, 4L));
        assertNotEquals(before, after);
    }

    @Test
    void envelopeHashChangesWhenPolicyChanges_invalidatingOldSignatures() {
        Document doc = docWith(10L, "abc123", 1);
        envelope.applyEnvelope(doc, List.of(1L, 2L, 3L));
        String legalSignatureEnvelope = doc.getEnvelopeHash();
        assertNotNull(legalSignatureEnvelope);

        envelope.applyEnvelope(doc, List.of(1L, 2L, 4L));
        String newEnvelope = doc.getEnvelopeHash();

        assertNotEquals(legalSignatureEnvelope, newEnvelope);
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