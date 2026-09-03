package com.attest.attest;

import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.exception.InvalidFileException;
import com.attest.attest.model.AuditLog;
import com.attest.attest.model.Document;
import com.attest.attest.repository.AuditLogRepository;
import com.attest.attest.repository.DocumentRepository;
import com.attest.attest.service.DocumentService;
import com.attest.attest.service.HashService;
import com.attest.attest.storage.DocumentStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DocumentServiceSecurityTests {

    private DocumentRepository documentRepository;
    private DocumentStorageService storageService;
    private AuditLogRepository auditLogRepository;
    private DocumentService service;
    private Document document;

    @BeforeEach
    void setUp() throws IOException {
        documentRepository = mock(DocumentRepository.class);
        storageService = mock(DocumentStorageService.class);
        auditLogRepository = mock(AuditLogRepository.class);
        service = new DocumentService(documentRepository, storageService, new HashService(), auditLogRepository);
        document = new Document();
        document.setId(10L);
        document.setOwnerId(1L);
        document.setRootDocumentId(10L);
        document.setDocumentHash(new HashService().sha256(pdfBytes()));
        document.setVersion(1);
        when(documentRepository.findById(10L)).thenReturn(java.util.Optional.of(document));
        when(storageService.store(any())).thenReturn("target/test-storage/document.pdf");
    }

    @Test
    void ownerCanVerifyAndAuditUsesAuthenticatedActor() throws IOException {
        var result = service.verify(10L, pdf("document.pdf"), 1L, "VIEWER");

        assertTrue(result.verified());
        assertEquals("Hash verified", result.resultMessage());
        verify(auditLogRepository).save(argThat(log -> log.getAction().equals("VERIFY_SUCCESS") && log.getPerformedBy().equals(1L)));
    }

    @Test
    void anotherUserCannotVerifyOrAmendDocument() {
        assertThrows(ForbiddenException.class, () -> service.verify(10L, pdf("document.pdf"), 2L, "VIEWER"));
        assertThrows(ForbiddenException.class, () -> service.amend(10L, pdf("document.pdf"), 2L, "SIGNER"));
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void adminCanAmendAnotherUsersDocument() throws IOException {
        Document newVersion = new Document();
        newVersion.setId(11L);
        when(documentRepository.save(any(Document.class))).thenReturn(newVersion);
        when(documentRepository.findByRootDocumentIdOrderByVersionAsc(10L)).thenReturn(List.of(document));

        assertDoesNotThrow(() -> service.amend(10L, pdf("document.pdf"), 99L, "ADMIN"));
    }

    @Test
    void invalidPdfAndOversizedFilesAreRejected() {
        MockMultipartFile fakePdf = new MockMultipartFile("file", "fake.pdf", "application/pdf", "not a PDF".getBytes());
        assertThrows(InvalidFileException.class, () -> service.upload(fakePdf, 1L, "SIGNER"));

        byte[] oversized = new byte[10 * 1024 * 1024 + 1];
        oversized[0] = '%';
        oversized[1] = 'P';
        oversized[2] = 'D';
        oversized[3] = 'F';
        oversized[4] = '-';
        MockMultipartFile largePdf = new MockMultipartFile("file", "large.pdf", "application/pdf", oversized);
        assertThrows(InvalidFileException.class, () -> service.upload(largePdf, 1L, "SIGNER"));
    }

    @Test
    void modifiedPdfFailsIntegrityVerification() throws IOException {
        var result = service.verify(10L,
                new MockMultipartFile("file", "document.pdf", "application/pdf", pdfWithContent("changed").getBytes()),
                1L, "VIEWER");

        assertFalse(result.verified());
        assertEquals("Integrity verification failed", result.resultMessage());
        verify(auditLogRepository).save(argThat(log -> log.getAction().equals("VERIFY_FAILED") && log.getPerformedBy().equals(1L)));
    }

    @Test
    void ownerCanReadDocumentMetadataVersionsAndAudit() {
        when(documentRepository.findByRootDocumentIdOrderByVersionAsc(10L)).thenReturn(List.of(document));
        when(auditLogRepository.findByDocumentIdInOrderByTimestampAsc(List.of(10L))).thenReturn(List.of(new AuditLog()));

        assertEquals(document, service.getDocument(10L, 1L, "VIEWER"));
        assertEquals(1, service.getVersions(10L, 1L, "VIEWER").size());
        assertEquals(1, service.getAuditTrail(10L, 1L, "VIEWER").size());
    }

    @Test
    void otherUserCannotReadDocumentMetadataVersionsOrAudit() {
        assertThrows(ForbiddenException.class, () -> service.getDocument(10L, 2L, "VIEWER"));
        assertThrows(ForbiddenException.class, () -> service.getVersions(10L, 2L, "VIEWER"));
        assertThrows(ForbiddenException.class, () -> service.getAuditTrail(10L, 2L, "VIEWER"));
    }

    @Test
    void adminCanReadAnotherUsersDocumentMetadata() {
        assertEquals(document, service.getDocument(10L, 99L, "ADMIN"));
    }

    private MockMultipartFile pdf(String filename) {
        return new MockMultipartFile("file", filename, "application/pdf", pdfBytes());
    }

    private byte[] pdfBytes() {
        return pdfWithContent("original").getBytes();
    }

    private String pdfWithContent(String content) {
        return "%PDF-1.4\n" + content;
    }
}