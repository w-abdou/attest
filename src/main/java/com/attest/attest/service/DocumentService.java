package com.attest.attest.service;

import com.attest.attest.exception.DocumentNotFoundException;
import com.attest.attest.exception.ForbiddenException;
import com.attest.attest.exception.InvalidFileException;
import com.attest.attest.model.*;
import com.attest.attest.repository.*;
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

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("application/pdf");
    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

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

    // ---- authorization now flows through team membership ----

    /** Any member of the document's team may read/verify it. */
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

    /** All documents in every team the requester belongs to, latest version per family, newest first. */
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

    /** Documents belonging to a single team (requester must be a member), latest version per family. */
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

        // Signatures never carry across versions. Copy the *assignee list* forward as a
        // convenience, but the new version starts with zero signatures.
        for (DocumentSigner s : signerRepository.findByDocumentId(original.getId())) {
            DocumentSigner copy = new DocumentSigner();
            copy.setDocumentId(newVersion.getId());
            copy.setUserId(s.getUserId());
            signerRepository.save(copy);
        }

        logAction(newVersion.getId(), "AMENDED", requesterId, "new version " + newVersion.getVersion() + " of root " + rootId);
        return newVersion;
    }

    // ---- assignment & signing ----

    /** Only the uploader (or a team admin) may set who must sign this specific version. */
    public void assignSigners(Long documentId, List<Long> signerUserIds, Long requesterId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        boolean isUploader = doc.getOwnerId().equals(requesterId);
        boolean isTeamAdmin = membershipRepository.findByTeamIdAndUserId(doc.getTeamId(), requesterId)
                .map(m -> m.getTeamRole() == TeamRole.TEAM_ADMIN).orElse(false);
        if (!isUploader && !isTeamAdmin) {
            throw new ForbiddenException("Only the uploader or a team admin can set required signers");
        }

        // Every assignee must be a member of the document's team.
        for (Long uid : signerUserIds) {
            membershipRepository.findByTeamIdAndUserId(doc.getTeamId(), uid)
                    .orElseThrow(() -> new ForbiddenException("User " + uid + " is not a member of this team"));
        }

        // Replace the assignee set for this version. Existing signatures for removed
        // signers are also cleared to keep state consistent.
        signerRepository.deleteByDocumentId(documentId);
        for (Long uid : signerUserIds) {
            DocumentSigner s = new DocumentSigner();
            s.setDocumentId(documentId);
            s.setUserId(uid);
            signerRepository.save(s);
        }

        // Recompute the policy + envelope hashes for the new signer set. This changes
        // envelopeHash, which invalidates any signatures collected against the old
        // policy (they bound to the old hash and no longer match).
        envelopeService.applyEnvelope(doc, signerUserIds);
        documentRepository.save(doc);

        recomputeStatus(doc);
        logAction(documentId, "SIGNERS_ASSIGNED", requesterId, signerUserIds.toString());
    }

    /** A user may sign only if they were assigned to THIS version. Role alone is never enough. */
    public void sign(Long documentId, Long requesterId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new DocumentNotFoundException(documentId));

        // Must be a team member at all.
        authorizeTeamMember(doc, requesterId);

        // Must be in this version's assignee set.
        signerRepository.findByDocumentIdAndUserId(documentId, requesterId)
                .orElseThrow(() -> new ForbiddenException("You are not an assigned signer for this document"));

        // Idempotent: don't create duplicate signatures.
        if (signatureRepository.findByDocumentIdAndSignerId(documentId, requesterId).isEmpty()) {
            DocumentSignature sig = new DocumentSignature();
            sig.setDocumentId(documentId);
            sig.setSignerId(requesterId);
            // Bind this signature to the envelope it was made against.
            sig.setEnvelopeHash(doc.getEnvelopeHash());
            signatureRepository.save(sig);
            logAction(documentId, "SIGNED", requesterId, null);
        }
        recomputeStatus(doc);
    }

    private void recomputeStatus(Document doc) {
        List<DocumentSigner> required = signerRepository.findByDocumentId(doc.getId());
        if (required.isEmpty()) {
            doc.setStatus(DocumentStatus.DRAFT);
        } else {
            // Only signatures bound to the document's CURRENT envelopeHash count.
            // A signature made against a previous policy (before signers were
            // reassigned) is stale and does not count toward the threshold.
            String currentEnvelope = doc.getEnvelopeHash();
            long validSigned = signatureRepository.findByDocumentId(doc.getId()).stream()
                    .filter(s -> currentEnvelope != null && currentEnvelope.equals(s.getEnvelopeHash()))
                    .count();
            doc.setStatus(validSigned >= required.size() ? DocumentStatus.FULLY_SIGNED : DocumentStatus.PENDING_SIGNATURES);
        }
        documentRepository.save(doc);
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