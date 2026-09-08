# Attest — Project Context

## What this project is
Attest is a secure document signing and verification platform. Long-term goal: a user
uploads a document, defines who must sign it, collects multiple cryptographic signatures,
detects later modification, and independently verifies the document and its signing history.

Target stack: Next.js/React/TypeScript frontend, Spring Boot/Java backend, PostgreSQL,
Sui/Move blockchain, Walrus decentralized storage, Seal encryption/access control. Built
incrementally over 3 weekly milestones. Do NOT introduce blockchain, Walrus, or Seal until
Week 2 work explicitly calls for it.

## Ground rules (read before changing anything)
- The GitHub repo is the source of truth. Verify claims against actual code, not docs.
- Do not rebuild or restructure working parts. Do not delete existing functionality.
- Small, reviewable branches -> pull request -> merge to master. Never commit straight to
  master. Existing convention: branch names like feature/xyz, merged via PR.
- After any backend change, run ./mvnw test and keep it green before moving on.
- Keep secrets out of git. Secrets come from environment variables only.
- Work in small steps the developer can review. When changing a file, edit it directly rather
  than asking the developer to paste. Ask before destructive actions or large schema changes.
- Preserve these security invariants at all times:
  1. Never trust client-supplied user IDs for authorization; identity comes from the JWT.
  2. Never trust client-supplied roles.
  3. Document versions are immutable; a new version is a new row, never a mutation.
  4. A modified document must fail SHA-256 verification.
  5. Signatures never carry across document versions.
  6. Audit events are server-written, not client-editable.
  7. Authorization is checked BEFORE resource existence, so unauthorized callers can't probe
     which IDs exist (return 403 for both "not allowed" and "doesn't exist").
  8. API errors must be generic — never leak stack traces or internals.

## How to run
Backend (from repo root), requires env vars exported first:
    export DB_PASSWORD=...            # PostgreSQL password
    export JWT_SECRET=...             # >= 32 bytes
    export ADMIN_BOOTSTRAP_EMAIL=admin@attest.dev
    export ADMIN_BOOTSTRAP_PASSWORD=...   # remember this; only stored hashed
    ./mvnw spring-boot:run            # runs on :8080 against PostgreSQL
    ./mvnw test                       # runs on in-memory H2; no env vars needed
Frontend:
    cd frontend && npm run dev        # runs on :3000

Notes:
- Schema is managed by Hibernate ddl-auto=update (no Flyway/Liquibase). New entities/columns
  are auto-created on startup; incompatible old rows are NOT auto-migrated.
- The admin account is created once at startup by AdminBootstrapRunner if the two
  ADMIN_BOOTSTRAP_* vars are set and that email doesn't already exist. It is the ONLY way to
  create an ADMIN. Changing the password requires deleting the row and restarting.
- CORS allows http://localhost:3000 by default (app.cors.allowed-origin). The JWT and
  rate-limit filters skip OPTIONS preflight requests.
- Rate limit: 5 requests/min/IP across /api/auth/login + /api/auth/register combined. Any
  end-to-end script making more than 5 auth calls must pause ~61s mid-run.

## Backend architecture
Layered: controller -> service -> repository -> entity (JPA). Entities use Lombok
(@Getter/@Setter/@NoArgsConstructor) — match that style in new entities. Auth is done by two
custom servlet filters (NOT Spring Security): JwtAuthFilter sets request attributes
"authenticatedUserId" (Long) and "authenticatedRole" (String); RateLimitFilter guards auth
endpoints. Controllers read those attributes; services take (…, requesterId, …) params and
enforce authorization themselves. DTOs are Java records; response DTOs have a static from(...).
GlobalExceptionHandler maps exceptions to status codes with a generic body.

## Two role systems (keep them separate — do not merge)
- Global Role enum {ADMIN, SIGNER, VIEWER}: system-level, lives in the JWT. Public
  registration always yields VIEWER. An admin-only endpoint promotes global roles.
- TeamRole enum {TEAM_ADMIN, TEAM_SIGNER, TEAM_VIEWER}: scoped per team, looked up LIVE from
  the DB per request (NOT in the JWT, since a user can be in many teams and memberships change
  while a token is valid).

## Data model
- User (global Role), Team, TeamMembership (unique per team+user), Document (belongs to a team
  via teamId; ownerId records the uploader only, it does NOT gate access),
  DocumentSigner (required signer for one specific immutable version),
  DocumentSignature (a NON-cryptographic "signed" record bound to one version),
  AuditLog (server-written).
- Access rule: any member of a document's team can read/verify it. Actions depend on TeamRole:
  TEAM_VIEWER = view + verify only; TEAM_SIGNER/TEAM_ADMIN = also upload/amend. Signing requires
  being in that version's assignee set — TeamRole alone is never enough. The uploader (or a
  TEAM_ADMIN) sets the required signers. Status reaches FULLY_SIGNED when every assigned signer
  has signed that version. Amending copies assignees forward but resets signatures.

## Current status
Week 1 done: platform foundations, document integrity & versioning, API engineering, security
controls, threat model (docs/security-assessment.md), Next.js frontend, CORS. Week 1 acceptance
check passes: upload a PDF -> "Hash verified"; change one byte -> "Integrity verification
failed"; each immutable version verifies against its own hash. Teams feature (above) is built
and tested (28 backend tests green; frontend builds). Confirm via git whether the teams work is
merged into master before starting Week 2.

## WEEK 2 — what we build next (milestone 2)
Goal: cryptographic signing bound inseparably to the approved signing policy, on Sui. The
developer is NEW to blockchain/Sui/Move — sequence concepts and a throwaway "hello world" BEFORE
Attest-specific Move code, and explain as you go. If the week slips, protect the policy-binding
logic (2.5) above wallet-UX polish.

Phases:
- 2.1 Sui & Web3 fundamentals: wallets/keypairs, zkLogin with OAuth, Sui object model, Move
  packages, full-node APIs, transactions, gas, events, signed personal messages. Set up Sui CLI
  + devnet and deploy a trivial Move package to prove the toolchain end to end.
- 2.4 (do the DATA MODEL early, before Move code): immutable Document Envelope
  {documentHash, documentId, version, policyHash, createdAt, expiry;
   envelopeHash = SHA-256(documentHash + documentId + version + policyHash + expiry)}
  and Document Signature {documentId, documentHash, version, policyHash, signerRole,
   issuedAt/expiresAt, Sui network, Move package ID}. A signature is valid only against one
  exact envelope.
- 2.5 Move package & multi-sig policy (CORE deliverable): entry functions to register a
  document, submit/revoke a signature, revoke a document, verify proof. Threshold: 3 required
  signatures -> FULLY_SIGNED only once satisfied. policyHash binding is the crux — changing the
  required signer set changes policyHash and INVALIDATES signatures already collected.
- 2.2 Wallet & sponsorship tooling: Sui dApp Kit connection UI for wallets + zkLogin; Enoki for
  managed OAuth/proof/salt and sponsored transactions (no SUI needed for gas).
- 2.3 Walrus & Seal integration: content-addressed encrypted blob storage, client-side
  encryption; Seal key servers + Move-based access-control policies. Replaces current local-disk
  storage BEHIND the existing DocumentStorageService interface (swap the implementation; do NOT
  remove the interface).

Week 2 acceptance check: Legal signs a document. Before Finance signs, an admin changes the
required CEO signer. The existing Legal signature must NO LONGER validate, because policyHash
has changed.

Core design rules for Week 2+:
- Encrypt document files client-side before storing on Walrus; keep PII/confidential metadata
  OUT of public Sui objects. Store only encrypted ciphertext on Walrus; the API stores the blob
  ID + hash.
- Use Seal access-control policies in the Move package to decide who can obtain decryption
  material — only authorized users decrypt the Walrus blob.
- A Sui address proves key control, not organizational identity — map approved wallet/zkLogin
  addresses to verified corporate identities separately.
- Bind every signature to document hash, version, signing policy, expiry, chain, and contract to
  prevent replay or silent policy changes.
- The current non-cryptographic DocumentSignature is a placeholder; Week 2 replaces it with real
  Sui-backed signatures. Preserve the "signatures never cross versions" behavior.

## Working with the developer
Has a tech background but is new to this stack and to blockchain. Explain new concepts briefly
as they come up. Prefer small steps to run and verify over big drops. Give complete files when
replacing a file. Confirm tests pass after backend changes. Ask before large schema changes or
anything that deletes data.
