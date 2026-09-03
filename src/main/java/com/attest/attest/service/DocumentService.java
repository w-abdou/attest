package com.attest.attest.service;

import com.attest.attest.exception.DocumentNotFoundException;
import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.exception.InvalidFileException;
import com.attest.attest.model.AuditLog;
import com.attest.attest.model.Document;
import com.attest.attest.repository.AuditLogRepository;
import com.attest.attest.repository.DocumentRepository;
import com.attest.attest.storage.DocumentStorageService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class DocumentService {

    private static final Set<String> UPLOAD_ROLES = Set.of("ADMIN", "SIGNER");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    private final DocumentRepository documentRepository;
    private final DocumentStorageService storageService;
    private final HashService hashService;
    private final AuditLogRepository auditLogRepository;

    public DocumentService(DocumentRepository documentRepository, DocumentStorageService storageService, HashService hashService, AuditLogRepository auditLogRepository) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.hashService = hashService;
        this.auditLogRepository = auditLogRepository;
    }

    private void validateFile(MultipartFile file) {
        if (file.isEmpty() || file.getSize() == 0) {
            throw new InvalidFileException("File must not be empty");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds maximum size of 10MB");
        }
        if (!ALLOWED_CONTENT_TYPES.contains(file.getContentType()) || !hasPdfSignature(file)) {
            throw new InvalidFileException("Only valid PDF files are accepted");
        }
    }

    private boolean hasPdfSignature(MultipartFile file) {
        try {
            byte[] prefix = file.getInputStream().readNBytes(5);
            return new String(prefix, StandardCharsets.US_ASCII).equals("%PDF-");
        } catch (IOException ex) {
            throw new InvalidFileException("Unable to inspect uploaded file");
        }
    }

    public Document upload(MultipartFile file, Long requesterId, String requesterRole) throws IOException {
        if (!UPLOAD_ROLES.contains(requesterRole)) {
            throw new ForbiddenException("Role " + requesterRole + " is not permitted to upload documents");
        }
        validateFile(file);

        byte[] fileBytes = file.getBytes();
        String hash = hashService.sha256(fileBytes);
        String reference = storageService.store(file);

        Document doc = new Document();
        doc.setFilename(file.getOriginalFilename());
        doc.setContentType(file.getContentType());
        doc.setStorageReference(reference);
        doc.setDocumentHash(hash);
        doc.setOwnerId(requesterId);
        documentRepository.save(doc);

        doc.setRootDocumentId(doc.getId());
        documentRepository.save(doc);

        logAction(doc.getId(), "UPLOADED", requesterId, "version " + doc.getVersion());

        return doc;
    }

    /**
     * Returns the documents the requester owns, one entry per document family
     * (the latest version only — amending a document doesn't create a second
     * entry here), newest first.
     */
    public List<Document> listDocuments(Long requesterId) {
        List<Document> owned = documentRepository.findByOwnerId(requesterId);

        Map<Long, Document> latestByRoot = new HashMap<>();
        for (Document d : owned) {
            Document current = latestByRoot.get(d.getRootDocumentId());
            if (current == null || d.getVersion() > current.getVersion()) {
                latestByRoot.put(d.getRootDocumentId(), d);
            }
        }

        return latestByRoot.values().stream()
                .sorted(Comparator.comparing(Document::getCreatedAt).reversed())
                .toList();
    }

    public Document getDocument(Long id, Long requesterId, String requesterRole) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeDocumentAccess(doc, requesterId, requesterRole);
        return doc;
    }

    public List<Document> getVersions(Long id, Long requesterId, String requesterRole) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeDocumentAccess(doc, requesterId, requesterRole);
        return documentRepository.findByRootDocumentIdOrderByVersionAsc(doc.getRootDocumentId());
    }

    public List<AuditLog> getAuditTrail(Long id, Long requesterId, String requesterRole) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeDocumentAccess(doc, requesterId, requesterRole);

        List<Long> versionIds = documentRepository.findByRootDocumentIdOrderByVersionAsc(doc.getRootDocumentId())
                .stream()
                .map(Document::getId)
                .toList();

        return auditLogRepository.findByDocumentIdInOrderByTimestampAsc(versionIds);
    }

    public VerifyResult verify(Long id, MultipartFile file, Long requesterId, String requesterRole) throws IOException {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));

        authorizeDocumentAccess(doc, requesterId, requesterRole);
        validateFile(file);

        String uploadedHash = hashService.sha256(file.getBytes());
        boolean matches = uploadedHash.equals(doc.getDocumentHash());

        logAction(doc.getId(), matches ? "VERIFY_SUCCESS" : "VERIFY_FAILED", requesterId, null);

        return new VerifyResult(doc.getId(), matches);
    }

    public Document amend(Long id, MultipartFile file, Long requesterId, String requesterRole) throws IOException {
        if (!UPLOAD_ROLES.contains(requesterRole)) {
            throw new ForbiddenException("Role " + requesterRole + " is not permitted to amend documents");
        }
        validateFile(file);

        Document original = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));

        authorizeDocumentAccess(original, requesterId, requesterRole);

        Long rootId = original.getRootDocumentId();
        List<Document> existingVersions = documentRepository.findByRootDocumentIdOrderByVersionAsc(rootId);
        Integer maxVersion = existingVersions.stream()
                .map(Document::getVersion)
                .max(Integer::compareTo)
                .orElse(original.getVersion());

        byte[] fileBytes = file.getBytes();
        String hash = hashService.sha256(fileBytes);
        String reference = storageService.store(file);

        Document newVersion = new Document();
        newVersion.setFilename(file.getOriginalFilename());
        newVersion.setContentType(file.getContentType());
        newVersion.setStorageReference(reference);
        newVersion.setDocumentHash(hash);
        newVersion.setOwnerId(original.getOwnerId());
        newVersion.setVersion(maxVersion + 1);
        newVersion.setRootDocumentId(rootId);
        documentRepository.save(newVersion);

        logAction(newVersion.getId(), "AMENDED", requesterId, "new version " + newVersion.getVersion() + " of root " + rootId);

        return newVersion;
    }

    private void authorizeDocumentAccess(Document document, Long requesterId, String requesterRole) {
        boolean isOwner = document.getOwnerId().equals(requesterId);
        boolean isAdmin = "ADMIN".equals(requesterRole);
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("You are not authorized to access this document");
        }
    }

    private void logAction(Long documentId, String action, Long performedBy, String detail) {
        AuditLog log = new AuditLog();
        log.setDocumentId(documentId);
        log.setAction(action);
        log.setPerformedBy(performedBy);
        log.setDetail(detail);
        auditLogRepository.save(log);
    }

    public record VerifyResult(Long documentId, boolean verified) {
        public String resultMessage() {
            return verified ? "Hash verified" : "Integrity verification failed";
        }
    }
}