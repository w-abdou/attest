package com.attest.attest.service;

import com.attest.attest.model.Document;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Computes the signing-policy hashes described in the Week 2 roadmap (2.4).
 * All off-chain for now; 2.5 anchors envelopeHash on Sui for tamper-evidence.
 */
@Service
public class EnvelopeService {

    private final HashService hashService;

    public EnvelopeService(HashService hashService) {
        this.hashService = hashService;
    }

    /**
     * policyHash = SHA-256 of the required-signer set, sorted so order doesn't
     * matter. Changing who must sign changes this value, which is what makes a
     * policy change invalidate previously collected signatures.
     */
    public String computePolicyHash(List<Long> signerUserIds) {
        String canonical = signerUserIds.stream()
                .sorted()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
        return hashService.sha256(("signers:" + canonical).getBytes(StandardCharsets.UTF_8));
    }

    /**
     * envelopeHash = SHA-256(documentHash + documentId + version + policyHash + expiry),
     * per the roadmap. This is the single value each signature binds to.
     */
    public String computeEnvelopeHash(Document doc) {
        String expiryPart = doc.getExpiry() == null ? "none" : doc.getExpiry().toString();
        String canonical = String.join("|",
                doc.getDocumentHash(),
                String.valueOf(doc.getId()),
                String.valueOf(doc.getVersion()),
                doc.getPolicyHash() == null ? "none" : doc.getPolicyHash(),
                expiryPart);
        return hashService.sha256(canonical.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Convenience: recompute both hashes for a document given its signer set,
     * mutating the document in place (caller saves it).
     */
    public void applyEnvelope(Document doc, List<Long> signerUserIds) {
        if (signerUserIds.isEmpty()) {
            doc.setPolicyHash(null);
            doc.setEnvelopeHash(null);
            return;
        }
        doc.setPolicyHash(computePolicyHash(signerUserIds));
        doc.setEnvelopeHash(computeEnvelopeHash(doc));
    }
}
