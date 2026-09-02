# Attest Security Assessment

Scope: Week 1 backend/API (registration, JWT authentication, document upload, versioning, verification, local storage, and audit logging). Reviewed 2026-09-02. Sui, Walrus, Seal, and document encryption are intentionally deferred to Week 2.

## Controls verified

- Document ownership is taken from the verified JWT request attributes. `ownerId` form fields are ignored. Owners and admins may access documents; other users receive 403. Public registration always creates `VIEWER`, so a request cannot self-assign `ADMIN` or `SIGNER`.
- Uploads are limited to PDF MIME type, `%PDF-` signature, non-empty content, and 10 MB. Storage names are generated and normalized beneath the configured directory; retrieval rejects references outside it.
- Login and registration are limited to five requests per minute per IP by an in-memory, per-instance filter.
- JWTs use an HMAC signing key, require a valid signature and expiration, and carry the authenticated subject and role. Missing, malformed, tampered, expired, or malformed-claim tokens are rejected.
- Passwords use BCrypt. DB and JWT secrets are configuration values; the JWT secret has no source default. SQL logging is disabled.
- Upload, amendment, and verification events are persisted with document, actor, timestamp, action, and detail. No API exposes audit mutation.
- Generic exceptions return minimal responses without stack traces, paths, class names, library versions, or database details.

## OWASP-aligned assessment

| ID | Threat | Severity | Status | Evidence | Impact | Remediation |
| -- | -- | -- | -- | -- | -- | -- |
| A01 | IDOR/BOLA: another user reads verification information or amends a document | High | Mitigated | `DocumentServiceSecurityTests`: owner succeeds; other user is denied; admin amendment succeeds | Cross-tenant document disclosure or unauthorized version creation | Keep ownership checks centralized and add controller integration coverage as new endpoints are added |
| A01 | Role escalation through registration or request fields | High | Mitigated | `UserServiceSecurityTests` proves an `ADMIN` request produces `VIEWER`; controllers use JWT attributes | Privileged document operations | Provision privileged roles server-side only |
| A02 | Password/JWT cryptographic failure | High | Mitigated for Week 1 | BCrypt in `UserService`; signed and expiring HMAC JWTs; tampered-token test passes | Account takeover or forged identity | Store a strong production `JWT_SECRET`; add key rotation later |
| A02 | Unencrypted local document storage | High | Accepted/deferred | Local disk is the Week 1 storage implementation | Disk compromise exposes document contents | Client-side encryption plus Walrus/Seal is Week 2 scope |
| A02 | SHA-256 integrity fingerprint | Medium | Mitigated | Upload hash is compared during verification; modified PDF test records `VERIFY_FAILED` | Changed content can be detected, but hash alone is not a signature | Bind future signatures to immutable envelopes in Week 2 |
| A03 | SQL/request injection | High | Mitigated | Spring Data JPA repositories use derived parameterized queries; no string-built SQL is present | Data disclosure or modification | Continue using repository/DTO validation patterns |
| A04 | Upload abuse and mutable signed history | High | Mitigated for Week 1 | MIME, magic-byte, size, empty-file, normalized-storage checks; amendments create new version IDs | Resource abuse or silent history changes | Add quotas and malware scanning for production; signature immutability is a Week 2 contract |
| A05 | Secrets, debug, and exception misconfiguration | High | Mitigated | DB password and JWT secret use environment/configuration; SQL logging disabled; generic handler is minimal | Secret disclosure or useful attacker diagnostics | Use a secret manager and production profile; do not commit `.env` files |
| A07 | Authentication failure, brute force, and token reuse | High | Partially mitigated | BCrypt, signed one-hour JWTs, malformed/expired rejection, and five-per-minute auth limit are tested | Credential attacks; stolen tokens remain usable until expiry | JWT revocation and refresh-token rotation are deferred; use HTTPS and a shared limiter in production |
| A09 | Missing security monitoring and alerting | Medium | Partially mitigated | `UPLOADED`, `AMENDED`, `VERIFY_SUCCESS`, and `VERIFY_FAILED` audit events include actor/document/time | Abuse may not trigger an alert | Add centralized immutable log shipping, retention, and anomaly alerts later |

## Explicit threat scenarios

- **Old versions / modified files:** each amendment is a new document row and hash; the original row remains unchanged. Verification of a changed valid PDF returns `Integrity verification failed` and records `VERIFY_FAILED`.
- **Unauthorized operations:** the JWT filter establishes identity before controllers run; the service compares that identity with the stored owner or the signed role `ADMIN`.
- **Token reuse:** there is no revocation list or refresh rotation. The one-hour expiry limits exposure, but a stolen token remains valid until expiry. This is a documented later-hardening item.
- **Distributed rate limiting:** the current limiter is intentionally in-memory and safe only for the single-instance Week 1 architecture. Redis or another shared store is required across instances.
- **Alerting:** audit logging is present; automated anomaly detection and paging are deferred.

## Test evidence

Run `./mvnw test`. The current suite covers context startup, ownership/role controls, upload and integrity checks, JWT tamper rejection, public role assignment, and the sixth-request rate-limit boundary. A live PostgreSQL run and client-level acceptance test remain deployment checks.
