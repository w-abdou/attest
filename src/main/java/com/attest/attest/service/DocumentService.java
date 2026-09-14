package com.attest.attest.service;

import com.attest.attest.dto.WalrusUploadRequest;
import com.attest.attest.exception.DocumentNotFoundException;
import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.exception.InvalidFileException;
import com.attest.attest.model.*;
import com.attest.attest.repository.*;
import com.attest.attest.storage.DocumentStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class DocumentService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    private static final Pattern SHA256_HEX = Pattern.compile("^[a-f0-9]{64}$");
    private static final String STORAGE_BACKEND_WALRUS = "WALRUS";

    private final DocumentRepository documentRepository;
    private final DocumentStorageService storageService;
    private final HashService hashService;
    private final AuditLogRepository auditLogRepository;
    private final TeamService teamService;
    private final DocumentSignerRepository signerRepository;
    private final DocumentSignatureRepository signatureRepository;
    private final TeamMembershipRepository membershipRepository;
    private final EnvelopeService envelopeService;

    public DocumentService(DocumentRepository documentRepository, DocumentStorageService storageService,
                           HashService hashService, AuditLogRepository auditLogRepository, TeamService teamService,
                           DocumentSignerRepository signerRepository, DocumentSignatureRepository signatureRepository,
                           TeamMembershipRepository membershipRepository, EnvelopeService envelopeService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.hashService = hashService;
        this.auditLogRepository = auditLogRepository;
        this.teamService = teamService;
        this.signerRepository = signerRepository;
        this.signatureRepository = signatureRepository;
        this.membershipRepository = membershipRepository;
        this.envelopeService = envelopeService;
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

    // A Walrus upload never gives the backend file bytes, so there is no magic-byte
    // sniff here — only the shape of the metadata the browser claims can be checked.
    // The content-type/size checks that matter for the file itself have to happen
    // client-side before it ever leaves the browser.
    private void validateWalrusUploadRequest(WalrusUploadRequest req) {
        if (!ALLOWED_CONTENT_TYPES.contains(req.contentType())) {
            throw new InvalidFileException("Only application/pdf documents are accepted");
        }
        if (req.size() > MAX_FILE_SIZE_BYTES) {
            throw new InvalidFileException("File exceeds maximum size of 10MB");
        }
        if (!SHA256_HEX.matcher(req.documentHash()).matches()) {
            throw new InvalidFileException("documentHash must be a 64-character lowercase hex SHA-256 digest");
        }
    }

    private void validateHash(String hash) {
        if (!SHA256_HEX.matcher(hash).matches()) {
            throw new InvalidFileException("documentHash must be a 64-character lowercase hex SHA-256 digest");
        }
    }

    // ---- authorization now flows through team membership ----

    private TeamMembership authorizeTeamMember(Document document, Long requesterId) {
        return membershipRepository.findByTeamIdAndUserId(document.getTeamId(), requesterId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this document's team"));
    }

    private void authorizeCanWrite(Long teamId, Long requesterId) {
        TeamMembership m = membershipRepository.findByTeamIdAndUserId(teamId, requesterId)
                .orElseThrow(() -> new ForbiddenException("You are not a member of this team"));
        if (m.getTeamRole() == TeamRole.TEAM_VIEWER) {
            throw new ForbiddenException("Viewers cannot upload or amend documents");
        }
    }

    @Transactional
    public Document upload(MultipartFile file, Long teamId, Long requesterId) throws IOException {
        authorizeCanWrite(teamId, requesterId);
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
        doc.setTeamId(teamId);
        documentRepository.save(doc);

        doc.setRootDocumentId(doc.getId());
        documentRepository.save(doc);

        logAction(doc.getId(), "UPLOADED", requesterId, "version " + doc.getVersion());
        return doc;
    }

    /**
     * The Walrus-backed sibling of {@link #upload}: the browser has already put
     * the (unencrypted for slice A, client-encrypted for slice B) bytes on
     * Walrus directly, so there is nothing to read or store here — just the
     * client-computed plaintext hash and blob reference to record.
     */
    @Transactional
    public Document uploadWalrus(WalrusUploadRequest req, Long teamId, Long requesterId) {
        authorizeCanWrite(teamId, requesterId);
        validateWalrusUploadRequest(req);

        Document doc = new Document();
        doc.setFilename(req.filename());
        doc.setContentType(req.contentType());
        doc.setStorageBackend(STORAGE_BACKEND_WALRUS);
        doc.setWalrusBlobId(req.walrusBlobId());
        doc.setWalrusBlobObjectId(req.walrusBlobObjectId());
        doc.setEncryptionKeyBase64(req.encryptionKeyBase64());
        doc.setDocumentHash(req.documentHash());
        doc.setOwnerId(requesterId);
        doc.setTeamId(teamId);
        documentRepository.save(doc);

        doc.setRootDocumentId(doc.getId());
        documentRepository.save(doc);

        logAction(doc.getId(), "UPLOADED", requesterId, "version " + doc.getVersion() + " (Walrus)");
        return doc;
    }

    public List<Document> listDocumentsForUser(Long requesterId) {
        List<Long> teamIds = teamService.membershipsForUser(requesterId).stream()
                .map(TeamMembership::getTeamId).toList();

        Map<Long, Document> latestByRoot = new HashMap<>();
        for (Long teamId : teamIds) {
            for (Document d : documentRepository.findByTeamId(teamId)) {
                Document current = latestByRoot.get(d.getRootDocumentId());
                if (current == null || d.getVersion() > current.getVersion()) {
                    latestByRoot.put(d.getRootDocumentId(), d);
                }
            }
        }
        return latestByRoot.values().stream()
                .sorted(Comparator.comparing(Document::getCreatedAt).reversed())
                .toList();
    }

    public List<Document> listDocumentsForTeam(Long teamId, Long requesterId) {
        teamService.getTeam(teamId);
        teamService.requireMembership(teamId, requesterId);

        Map<Long, Document> latestByRoot = new HashMap<>();
        for (Document d : documentRepository.findByTeamId(teamId)) {
            Document current = latestByRoot.get(d.getRootDocumentId());
            if (current == null || d.getVersion() > current.getVersion()) {
                latestByRoot.put(d.getRootDocumentId(), d);
            }
        }
        return latestByRoot.values().stream()
                .sorted(Comparator.comparing(Document::getCreatedAt).reversed())
                .toList();
    }

    public Document getDocument(Long id, Long requesterId) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeTeamMember(doc, requesterId);
        return doc;
    }

    public List<Document> getVersions(Long id, Long requesterId) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeTeamMember(doc, requesterId);
        return documentRepository.findByRootDocumentIdOrderByVersionAsc(doc.getRootDocumentId());
    }

    public List<AuditLog> getAuditTrail(Long id, Long requesterId) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeTeamMember(doc, requesterId);

        List<Long> versionIds = documentRepository.findByRootDocumentIdOrderByVersionAsc(doc.getRootDocumentId())
                .stream().map(Document::getId).toList();
        return auditLogRepository.findByDocumentIdInOrderByTimestampAsc(versionIds);
    }

    @Transactional
    public VerifyResult verify(Long id, MultipartFile file, Long requesterId) throws IOException {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeTeamMember(doc, requesterId);
        validateFile(file);

        String uploadedHash = hashService.sha256(file.getBytes());
        boolean matches = uploadedHash.equals(doc.getDocumentHash());
        logAction(doc.getId(), matches ? "VERIFY_SUCCESS" : "VERIFY_FAILED", requesterId, null);
        return new VerifyResult(doc.getId(), matches);
    }

    /**
     * The Walrus-backed sibling of {@link #verify}: the browser has already
     * downloaded the blob (and decrypted it, for slice B) and hashed the
     * plaintext itself, so this just compares against the stored hash and
     * audits the outcome — same semantics as {@link #verify}, no file bytes.
     */
    @Transactional
    public VerifyResult verifyHash(Long id, String documentHash, Long requesterId) {
        Document doc = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeTeamMember(doc, requesterId);
        validateHash(documentHash);

        boolean matches = documentHash.equals(doc.getDocumentHash());
        logAction(doc.getId(), matches ? "VERIFY_SUCCESS" : "VERIFY_FAILED", requesterId, null);
        return new VerifyResult(doc.getId(), matches);
    }

    @Transactional
    public Document amend(Long id, MultipartFile file, Long requesterId) throws IOException {
        Document original = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeCanWrite(original.getTeamId(), requesterId);
        validateFile(file);

        Long rootId = original.getRootDocumentId();
        List<Document> existingVersions = documentRepository.findByRootDocumentIdOrderByVersionAsc(rootId);
        Integer maxVersion = existingVersions.stream().map(Document::getVersion).max(Integer::compareTo).orElse(original.getVersion());

        byte[] fileBytes = file.getBytes();
        String hash = hashService.sha256(fileBytes);
        String reference = storageService.store(file);

        Document newVersion = new Document();
        newVersion.setFilename(file.getOriginalFilename());
        newVersion.setContentType(file.getContentType());
        newVersion.setStorageReference(reference);
        newVersion.setDocumentHash(hash);
        newVersion.setOwnerId(original.getOwnerId());
        newVersion.setTeamId(original.getTeamId());
        newVersion.setVersion(maxVersion + 1);
        newVersion.setRootDocumentId(rootId);
        documentRepository.save(newVersion);

        for (DocumentSigner s : signerRepository.findByDocumentId(original.getId())) {
            DocumentSigner copy = new DocumentSigner();
            copy.setDocumentId(newVersion.getId());
            copy.setUserId(s.getUserId());
            signerRepository.save(copy);
        }

        logAction(newVersion.getId(), "AMENDED", requesterId, "new version " + newVersion.getVersion() + " of root " + rootId);
        return newVersion;
    }

    /** The Walrus-backed sibling of {@link #amend} — same versioning/signer-carryover rules, no file bytes. */
    @Transactional
    public Document amendWalrus(Long id, WalrusUploadRequest req, Long requesterId) {
        Document original = documentRepository.findById(id)
                .orElseThrow(() -> new DocumentNotFoundException(id));
        authorizeCanWrite(original.getTeamId(), requesterId);
        validateWalrusUploadRequest(req);

        Long rootId = original.getRootDocumentId();
        List<Document> existingVersions = documentRepository.findByRootDocumentIdOrderByVersionAsc(rootId);
        Integer maxVersion = existingVersions.stream().map(Document::getVersion).max(Integer::compareTo).orElse(original.getVersion());

        Document newVersion = new Document();
        newVersion.setFilename(req.filename());
        newVersion.setContentType(req.contentType());
        newVersion.setStorageBackend(STORAGE_BACKEND_WALRUS);
        newVersion.setWalrusBlobId(req.walrusBlobId());
        newVersion.setWalrusBlobObjectId(req.walrusBlobObjectId());
        newVersion.setEncryptionKeyBase64(req.encryptionKeyBase64());
        newVersion.setDocumentHash(req.documentHash());
        newVersion.setOwnerId(original.getOwnerId());
        newVersion.setTeamId(original.getTeamId());
        newVersion.setVersion(maxVersion + 1);
        newVersion.setRootDocumentId(rootId);
        documentRepository.save(newVersion);

        for (DocumentSigner s : signerRepository.findByDocumentId(original.getId())) {
            DocumentSigner copy = new DocumentSigner();
            copy.setDocumentId(newVersion.getId());
            copy.setUserId(s.getUserId());
            signerRepository.save(copy);
        }

        logAction(newVersion.getId(), "AMENDED", requesterId, "new version " + newVersion.getVersion() + " of root " + rootId + " (Walrus)");
        return newVersion;
    }

    // ---- assignment & signing ----

    @Transactional
    public void assignSigners(Long documentId, List<Long> signerUserIds, Long requesterId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        boolean isUploader = doc.getOwnerId().equals(requesterId);
        boolean isTeamAdmin = membershipRepository.findByTeamIdAndUserId(doc.getTeamId(), requesterId)
                .map(m -> m.getTeamRole() == TeamRole.TEAM_ADMIN).orElse(false);
        if (!isUploader && !isTeamAdmin) {
            throw new ForbiddenException("Only the uploader or a team admin can set required signers");
        }

        for (Long uid : signerUserIds) {
            membershipRepository.findByTeamIdAndUserId(doc.getTeamId(), uid)
                    .orElseThrow(() -> new ForbiddenException("User " + uid + " is not a member of this team"));
        }

        signerRepository.deleteByDocumentId(documentId);
        signatureRepository.deleteByDocumentId(documentId);
        signerRepository.flush();
        signatureRepository.flush();
        for (Long uid : signerUserIds) {
            DocumentSigner s = new DocumentSigner();
            s.setDocumentId(documentId);
            s.setUserId(uid);
            signerRepository.save(s);
        }

        envelopeService.applyEnvelope(doc, signerUserIds);
        documentRepository.save(doc);

        recomputeStatus(doc);
        logAction(documentId, "SIGNERS_ASSIGNED", requesterId, signerUserIds.toString());
    }

    @Transactional
    public void sign(Long documentId, Long requesterId, String txDigest, String signerAddress) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        authorizeTeamMember(doc, requesterId);

        signerRepository.findByDocumentIdAndUserId(documentId, requesterId)
                .orElseThrow(() -> new ForbiddenException("You are not an assigned signer for this document"));

        if (doc.getOnchainObjectId() == null) {
            throw new ForbiddenException("This document has not been registered on-chain yet");
        }

        var existing = signatureRepository.findByDocumentIdAndSignerId(documentId, requesterId);
        if (existing.isEmpty()) {
            DocumentSignature sig = new DocumentSignature();
            sig.setDocumentId(documentId);
            sig.setSignerId(requesterId);
            sig.setEnvelopeHash(doc.getEnvelopeHash());
            sig.setOnchainTxDigest(txDigest);
            sig.setSignerAddress(signerAddress);
            signatureRepository.save(sig);
            logAction(documentId, "SIGNED", requesterId, "onchain tx " + txDigest);
        }
        recomputeStatus(doc);
    }

    private void recomputeStatus(Document doc) {
        List<DocumentSigner> required = signerRepository.findByDocumentId(doc.getId());
        if (required.isEmpty()) {
            doc.setStatus(DocumentStatus.DRAFT);
        } else {
            String currentEnvelope = doc.getEnvelopeHash();
            long validSigned = signatureRepository.findByDocumentId(doc.getId()).stream()
                    .filter(s -> currentEnvelope != null && currentEnvelope.equals(s.getEnvelopeHash()))
                    .count();
            doc.setStatus(validSigned >= required.size() ? DocumentStatus.FULLY_SIGNED : DocumentStatus.PENDING_SIGNATURES);
        }
        documentRepository.save(doc);
    }

    @Transactional
    public Document recordOnchainRegistration(Long documentId, String objectId, String txDigest,
                                              String packageId, String network, Long requesterId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        boolean isUploader = doc.getOwnerId().equals(requesterId);
        boolean isTeamAdmin = membershipRepository.findByTeamIdAndUserId(doc.getTeamId(), requesterId)
                .map(m -> m.getTeamRole() == TeamRole.TEAM_ADMIN).orElse(false);
        if (!isUploader && !isTeamAdmin) {
            throw new ForbiddenException("Only the uploader or a team admin can register this document on-chain");
        }

        doc.setOnchainObjectId(objectId);
        doc.setOnchainTxDigest(txDigest);
        doc.setOnchainPackageId(packageId);
        doc.setOnchainNetwork(network);
        documentRepository.save(doc);

        logAction(documentId, "ONCHAIN_REGISTERED", requesterId, "object " + objectId + " tx " + txDigest);
        return doc;
    }

    public List<DocumentSigner> getSigners(Long documentId, Long requesterId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
        authorizeTeamMember(doc, requesterId);
        return signerRepository.findByDocumentId(documentId);
    }

    public List<DocumentSignature> getSignatures(Long documentId, Long requesterId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));
        authorizeTeamMember(doc, requesterId);
        return signatureRepository.findByDocumentId(documentId);
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