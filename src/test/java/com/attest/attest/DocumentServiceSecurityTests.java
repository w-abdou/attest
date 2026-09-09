package com.attest.attest;

import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.exception.InvalidFileException;
import com.attest.attest.model.*;
import com.attest.attest.repository.*;
import com.attest.attest.service.DocumentService;
import com.attest.attest.service.EnvelopeService;
import com.attest.attest.service.HashService;
import com.attest.attest.service.TeamService;
import com.attest.attest.storage.DocumentStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DocumentServiceSecurityTests {

    private DocumentRepository documentRepository;
    private DocumentStorageService storageService;
    private AuditLogRepository auditLogRepository;
    private TeamService teamService;
    private DocumentSignerRepository signerRepository;
    private DocumentSignatureRepository signatureRepository;
    private TeamMembershipRepository membershipRepository;
    private DocumentService service;
    private Document document;

    private static final Long TEAM = 100L;

    @BeforeEach
    void setUp() throws IOException {
        documentRepository = mock(DocumentRepository.class);
        storageService = mock(DocumentStorageService.class);
        auditLogRepository = mock(AuditLogRepository.class);
        teamService = mock(TeamService.class);
        signerRepository = mock(DocumentSignerRepository.class);
        signatureRepository = mock(DocumentSignatureRepository.class);
        membershipRepository = mock(TeamMembershipRepository.class);

        HashService hashService = new HashService();
        EnvelopeService envelopeService = new EnvelopeService(hashService);

        service = new DocumentService(documentRepository, storageService, hashService,
                auditLogRepository, teamService, signerRepository, signatureRepository, membershipRepository,
                envelopeService);

        document = new Document();
        document.setId(10L);
        document.setOwnerId(1L);
        document.setTeamId(TEAM);
        document.setRootDocumentId(10L);
        document.setDocumentHash(new HashService().sha256(pdfBytes()));
        document.setVersion(1);

        when(documentRepository.findById(10L)).thenReturn(Optional.of(document));
        when(storageService.store(any())).thenReturn("target/test-storage/document.pdf");
    }

    private void member(Long userId, TeamRole role) {
        TeamMembership m = new TeamMembership();
        m.setTeamId(TEAM);
        m.setUserId(userId);
        m.setTeamRole(role);
        when(membershipRepository.findByTeamIdAndUserId(TEAM, userId)).thenReturn(Optional.of(m));
    }

    private void notAMember(Long userId) {
        when(membershipRepository.findByTeamIdAndUserId(TEAM, userId)).thenReturn(Optional.empty());
    }

    @Test
    void teamMemberCanVerify_andAuditUsesAuthenticatedActor() throws IOException {
        member(1L, TeamRole.TEAM_VIEWER);
        var result = service.verify(10L, pdf("document.pdf"), 1L);

        assertTrue(result.verified());
        assertEquals("Hash verified", result.resultMessage());
        verify(auditLogRepository).save(argThat(log -> log.getAction().equals("VERIFY_SUCCESS") && log.getPerformedBy().equals(1L)));
    }

    @Test
    void nonMemberCannotVerifyOrRead() {
        notAMember(2L);
        assertThrows(ForbiddenException.class, () -> service.verify(10L, pdf("document.pdf"), 2L));
        assertThrows(ForbiddenException.class, () -> service.getDocument(10L, 2L));
    }

    @Test
    void viewerCannotAmend_butSignerCan() throws IOException {
        member(3L, TeamRole.TEAM_VIEWER);
        assertThrows(ForbiddenException.class, () -> service.amend(10L, pdf("document.pdf"), 3L));

        member(4L, TeamRole.TEAM_SIGNER);
        when(documentRepository.findByRootDocumentIdOrderByVersionAsc(10L)).thenReturn(List.of(document));
        when(documentRepository.save(any(Document.class))).thenAnswer(inv -> {
            Document d = inv.getArgument(0);
            if (d.getId() == null) d.setId(11L);
            return d;
        });
        when(signerRepository.findByDocumentId(10L)).thenReturn(List.of());
        assertDoesNotThrow(() -> service.amend(10L, pdf("document.pdf"), 4L));
    }

    @Test
    void invalidPdfAndOversizedFilesAreRejected() {
        member(1L, TeamRole.TEAM_SIGNER);
        when(teamService.getTeam(TEAM)).thenReturn(new Team());

        MockMultipartFile fakePdf = new MockMultipartFile("file", "fake.pdf", "application/pdf", "not a PDF".getBytes());
        assertThrows(InvalidFileException.class, () -> service.upload(fakePdf, TEAM, 1L));

        byte[] oversized = new byte[10 * 1024 * 1024 + 1];
        oversized[0] = '%'; oversized[1] = 'P'; oversized[2] = 'D'; oversized[3] = 'F'; oversized[4] = '-';
        MockMultipartFile largePdf = new MockMultipartFile("file", "large.pdf", "application/pdf", oversized);
        assertThrows(InvalidFileException.class, () -> service.upload(largePdf, TEAM, 1L));
    }

    @Test
    void modifiedPdfFailsIntegrityVerification() throws IOException {
        member(1L, TeamRole.TEAM_VIEWER);
        var result = service.verify(10L,
                new MockMultipartFile("file", "document.pdf", "application/pdf", pdfWithContent("changed").getBytes()),
                1L);

        assertFalse(result.verified());
        assertEquals("Integrity verification failed", result.resultMessage());
        verify(auditLogRepository).save(argThat(log -> log.getAction().equals("VERIFY_FAILED")));
    }

    @Test
    void onlyAssignedSignerCanSign() {
        member(5L, TeamRole.TEAM_SIGNER);
        when(signerRepository.findByDocumentIdAndUserId(10L, 5L)).thenReturn(Optional.empty());
        assertThrows(ForbiddenException.class, () -> service.sign(10L, 5L));

        DocumentSigner assignment = new DocumentSigner();
        assignment.setDocumentId(10L);
        assignment.setUserId(5L);
        when(signerRepository.findByDocumentIdAndUserId(10L, 5L)).thenReturn(Optional.of(assignment));
        when(signatureRepository.findByDocumentIdAndSignerId(10L, 5L)).thenReturn(Optional.empty());
        when(signerRepository.findByDocumentId(10L)).thenReturn(List.of(assignment));
        when(signatureRepository.findByDocumentId(10L)).thenReturn(List.of());
        assertDoesNotThrow(() -> service.sign(10L, 5L));
        verify(signatureRepository).save(argThat(s -> s.getSignerId().equals(5L)));
    }

    @Test
    void assigningSignerWhoIsNotATeamMemberIsRejected() {
        member(1L, TeamRole.TEAM_ADMIN);
        notAMember(999L);
        assertThrows(ForbiddenException.class, () -> service.assignSigners(10L, List.of(999L), 1L));
    }

    @Test
    void nonUploaderNonAdminCannotAssignSigners() {
        member(7L, TeamRole.TEAM_SIGNER);
        assertThrows(ForbiddenException.class, () -> service.assignSigners(10L, List.of(7L), 7L));
    }

    /**
     * The integration test that would have caught the missing-wiring bug:
     * assign signers -> the document gets an envelopeHash; sign -> signature is
     * stamped with that envelope; reassign signers -> envelope changes -> the
     * prior signature no longer matches, so status is not FULLY_SIGNED.
     */
    @Test
    void reassigningSignersInvalidatesPriorSignature() {
        // A simple in-memory store for signers and signatures so the real
        // envelope-recompute + status logic runs end to end.
        List<DocumentSigner> signers = new ArrayList<>();
        List<DocumentSignature> signatures = new ArrayList<>();

        member(1L, TeamRole.TEAM_ADMIN); // uploader/admin
        member(2L, TeamRole.TEAM_SIGNER);
        member(3L, TeamRole.TEAM_SIGNER);

        when(signerRepository.findByDocumentId(10L)).thenAnswer(inv -> new ArrayList<>(signers));
        doAnswer(inv -> { signers.clear(); return null; }).when(signerRepository).deleteByDocumentId(10L);
        when(signerRepository.save(any(DocumentSigner.class))).thenAnswer(inv -> {
            DocumentSigner s = inv.getArgument(0);
            signers.add(s);
            return s;
        });
        when(signerRepository.findByDocumentIdAndUserId(eq(10L), any())).thenAnswer(inv -> {
            Long uid = inv.getArgument(1);
            return signers.stream().filter(s -> s.getUserId().equals(uid)).findFirst();
        });
        when(signatureRepository.findByDocumentId(10L)).thenAnswer(inv -> new ArrayList<>(signatures));
        when(signatureRepository.findByDocumentIdAndSignerId(eq(10L), any())).thenAnswer(inv -> {
            Long uid = inv.getArgument(1);
            return signatures.stream().filter(s -> s.getSignerId().equals(uid)).findFirst();
        });
        when(signatureRepository.save(any(DocumentSignature.class))).thenAnswer(inv -> {
            DocumentSignature s = inv.getArgument(0);
            signatures.add(s);
            return s;
        });

        // Assign signers {2,3}; document gets an envelope.
        service.assignSigners(10L, List.of(2L, 3L), 1L);
        String envelopeAfterFirstAssign = document.getEnvelopeHash();
        assertNotNull(envelopeAfterFirstAssign);

        // Signer 2 signs; stamped with the current envelope.
        service.sign(10L, 2L);
        assertEquals(1, signatures.size());
        assertEquals(envelopeAfterFirstAssign, signatures.get(0).getEnvelopeHash());
        assertEquals(DocumentStatus.PENDING_SIGNATURES, document.getStatus());

        // Reassign to {2,4-> use 3 swapped}: change the set to {3, 2} is same set,
        // so change to a genuinely different set {2} only, which changes policyHash.
        member(4L, TeamRole.TEAM_SIGNER);
        service.assignSigners(10L, List.of(2L, 4L), 1L);
        String envelopeAfterReassign = document.getEnvelopeHash();

        // Envelope changed, so signer 2's earlier signature is now stale.
        assertNotEquals(envelopeAfterFirstAssign, envelopeAfterReassign);
        assertNotEquals(DocumentStatus.FULLY_SIGNED, document.getStatus());
    }

    private MockMultipartFile pdf(String filename) {
        return new MockMultipartFile("file", filename, "application/pdf", pdfBytes());
    }
    private byte[] pdfBytes() { return pdfWithContent("original").getBytes(); }
    private String pdfWithContent(String content) { return "%PDF-1.4\n" + content; }
}