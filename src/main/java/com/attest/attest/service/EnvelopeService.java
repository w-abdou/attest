package com.attest.attest.service;

import com.attest.attest.model.Document;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;


@Service
public class EnvelopeService {

    private final HashService hashService;

    public EnvelopeService(HashService hashService) {
        this.hashService = hashService;
    }

     public String computePolicyHash(List<Long> signerUserIds) {
        String canonical = signerUserIds.stream()
                .sorted()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
        return hashService.sha256(("signers:" + canonical).getBytes(StandardCharsets.UTF_8));
    }

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