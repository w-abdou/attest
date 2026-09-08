"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import {
  ApiError, AuditLogResponse, DocumentResponse, SignatureResponse,
  TeamMemberResponse, VerifyResponse,
} from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import PageHeader from "@/components/PageHeader";
import SignatureProgress from "@/components/SignatureProgress";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import Badge, { StatusBadge } from "@/components/ui/Badge";
import FileDrop from "@/components/ui/FileDrop";
import HashDisplay from "@/components/ui/HashDisplay";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import {
  AlertIcon, CheckCircleIcon, HistoryIcon, LayersIcon, PenIcon,
  ShieldIcon, UploadIcon, UsersIcon,
} from "@/components/ui/Icons";
import { formatDateTime, shortHash, timeAgo } from "@/lib/format";

function DocumentDetailContent() {
  const params = useParams<{ id: string }>();
  const documentId = Number(params.id);
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [doc, setDoc] = useState<DocumentResponse | null>(null);
  const [versions, setVersions] = useState<DocumentResponse[]>([]);
  const [audit, setAudit] = useState<AuditLogResponse[]>([]);
  const [signers, setSigners] = useState<SignatureResponse[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberResponse[]>([]);
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [amendFile, setAmendFile] = useState<File | null>(null);
  const [amending, setAmending] = useState(false);

  const [selectedSigners, setSelectedSigners] = useState<number[]>([]);
  const [savingSigners, setSavingSigners] = useState(false);
  const [signing, setSigning] = useState(false);
  const [confirmSign, setConfirmSign] = useState(false);

  const isUploader = doc?.ownerId === user?.id;
  const canManageSigners = isUploader || isTeamAdmin;
  const myAssignment = signers.find((s) => s.signerId === user?.id);
  const signedCount = signers.filter((s) => s.signed).length;

  const loadAll = useCallback(async () => {
    try {
      const [docResult, versionsResult, auditResult, signersResult] = await Promise.all([
        api.getDocument(documentId),
        api.getVersions(documentId),
        api.getAuditTrail(documentId),
        api.getSigners(documentId),
      ]);
      setDoc(docResult);
      setVersions(versionsResult);
      setAudit(auditResult);
      setSigners(signersResult);
      setSelectedSigners(signersResult.map((s) => s.signerId));
      setLoadError(null);

      // Team context drives who may edit the signer set. A viewer can read the
      // document without being able to list members, so this is best-effort.
      try {
        const [memberList, teams] = await Promise.all([
          api.listMembers(docResult.teamId),
          api.listTeams(),
        ]);
        setTeamMembers(memberList);
        const team = teams.find((t) => t.id === docResult.teamId);
        setIsTeamAdmin(team?.yourRole === "TEAM_ADMIN");
        setTeamName(team?.name ?? null);
      } catch {
        setTeamMembers([]);
        setIsTeamAdmin(false);
      }
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load this document.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  const validId = !Number.isNaN(documentId);
  // Attest keeps its JWT in localStorage, so data has to be fetched client-side
  // after mount rather than in a server component. Every setState in `loadAll` runs
  // after an await, which the lint rule cannot see through.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (validId) loadAll(); }, [validId, loadAll]);

  // A new file to check invalidates the previous verdict.
  function pickVerifyFile(file: File | null) {
    setVerifyFile(file);
    setVerifyResult(null);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!verifyFile) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifyDocument(documentId, verifyFile);
      setVerifyResult(result);
      await loadAll(); // Verification is an audited event.
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verification could not run.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleAmend(e: React.FormEvent) {
    e.preventDefault();
    if (!amendFile) return;
    setAmending(true);
    try {
      const newVersion = await api.amendDocument(documentId, amendFile);
      toast.success(`Version ${newVersion.version} created. Signatures did not carry over.`);
      router.push(`/documents/${newVersion.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create a new version.");
      setAmending(false);
    }
  }

  async function handleSaveSigners(e: React.FormEvent) {
    e.preventDefault();
    setSavingSigners(true);
    try {
      await api.assignSigners(documentId, selectedSigners);
      toast.success("Required signers updated for this version.");
      await loadAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update the signer set.");
    } finally {
      setSavingSigners(false);
    }
  }

  async function handleSign() {
    setSigning(true);
    try {
      await api.signDocument(documentId);
      setConfirmSign(false);
      toast.success("Your signature is recorded against this exact version.");
      await loadAll();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not record your signature.");
    } finally {
      setSigning(false);
    }
  }

  function toggleSigner(userId: number) {
    setSelectedSigners((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId],
    );
  }

  if (!validId) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Document unavailable" backHref="/documents" backLabel="All documents" />
        <Alert tone="error">That document id is not valid.</Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64 rounded-lg" />
        <Card><SkeletonRows rows={3} /></Card>
        <Card><SkeletonRows rows={2} /></Card>
      </div>
    );
  }

  if (loadError || !doc) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Document unavailable" backHref="/documents" backLabel="All documents" />
        <Alert tone="error">{loadError ?? "Could not load this document."}</Alert>
        <p className="mt-3 text-xs text-ink-500">
          Attest answers &ldquo;not allowed&rdquo; and &ldquo;does not exist&rdquo; the same way
          on purpose, so this message does not reveal whether the id is real.
        </p>
      </div>
    );
  }

  const isLatest = versions.length === 0 || doc.version === Math.max(...versions.map((v) => v.version));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={doc.filename}
        backHref={`/teams/${doc.teamId}`}
        backLabel={teamName ? `Back to ${teamName}` : "Back to team"}
        badge={<StatusBadge status={doc.status} />}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Version {doc.version}</span>
            <span aria-hidden="true">·</span>
            <span>Uploaded {timeAgo(doc.createdAt)}</span>
            <span aria-hidden="true">·</span>
            <span>Document id {doc.id}</span>
            {!isLatest && (
              <Badge tone="amber">Superseded by a newer version</Badge>
            )}
          </span>
        }
      />

      <div className="mb-6">
        <HashDisplay hash={doc.documentHash} full />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Verify */}
          <Card>
            <CardHeader
              icon={<ShieldIcon />}
              title="Verify integrity"
              description="Re-upload a copy of this file. Attest hashes it and compares against the digest stored for this version."
            />
            <CardBody className="space-y-3">
              <form onSubmit={handleVerify} className="space-y-3">
                <FileDrop
                  file={verifyFile}
                  onFile={pickVerifyFile}
                  disabled={verifying}
                  label="Drop the copy you want to check"
                  hint="Nothing is stored — the file is hashed and discarded"
                />
                <Button type="submit" loading={verifying} disabled={!verifyFile} icon={<ShieldIcon />}>
                  {verifying ? "Checking…" : "Verify this file"}
                </Button>
              </form>

              {verifyResult && (
                <div
                  role="status"
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    verifyResult.verified
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${
                      verifyResult.verified ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {verifyResult.verified ? <CheckCircleIcon /> : <AlertIcon />}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        verifyResult.verified ? "text-emerald-800" : "text-red-800"
                      }`}
                    >
                      {verifyResult.verified ? "Hash verified" : "Integrity verification failed"}
                    </p>
                    <p
                      className={`mt-0.5 text-xs leading-relaxed ${
                        verifyResult.verified ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {verifyResult.result}
                    </p>
                    {!verifyResult.verified && (
                      <p className="mt-1.5 text-xs leading-relaxed text-red-700">
                        The file you uploaded is not byte-for-byte identical to version{" "}
                        {doc.version}. Even a one-byte edit produces a different digest.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Signers */}
          <Card>
            <CardHeader
              icon={<PenIcon />}
              title="Required signers"
              description="Signatures are bound to this version alone and never carry into an amendment."
            />
            <CardBody className="space-y-4">
              <SignatureProgress signed={signedCount} total={signers.length} />

              {signers.length === 0 ? (
                <EmptyState
                  icon={<UsersIcon />}
                  title="No required signers yet"
                  description={
                    canManageSigners
                      ? "Choose who must sign this version below."
                      : "The uploader or a team admin needs to name the required signers."
                  }
                />
              ) : (
                <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
                  {signers.map((signer) => (
                    <li key={signer.signerId} className="flex items-center gap-3 px-3.5 py-2.5">
                      <Avatar email={signer.email} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-900">
                          {signer.email}
                          {signer.signerId === user?.id && (
                            <span className="ml-1.5 text-xs text-ink-400">(you)</span>
                          )}
                        </p>
                        {signer.signed && signer.signedAt && (
                          <p className="text-xs text-ink-500">{formatDateTime(signer.signedAt)}</p>
                        )}
                      </div>
                      {signer.signed ? (
                        <Badge tone="green"><CheckCircleIcon className="text-xs" /> Signed</Badge>
                      ) : (
                        <Badge tone="neutral">Pending</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {myAssignment && !myAssignment.signed && (
                <div className="rounded-xl border border-sui-200 bg-sui-50 p-4">
                  <p className="text-sm font-medium text-sui-900">Your signature is required</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-sui-800">
                    You are signing version {doc.version}, digest {shortHash(doc.documentHash, 8)}.
                    If this document is amended later, this signature will not carry forward.
                  </p>
                  <Button
                    variant="success" size="sm" className="mt-3"
                    icon={<PenIcon />} onClick={() => setConfirmSign(true)}
                  >
                    Sign this version
                  </Button>
                </div>
              )}

              {myAssignment?.signed && (
                <Alert tone="success" title="You have signed this version">
                  Recorded {myAssignment.signedAt ? formatDateTime(myAssignment.signedAt) : ""}.
                </Alert>
              )}

              {canManageSigners && teamMembers.length > 0 && (
                <form onSubmit={handleSaveSigners} className="space-y-3 border-t border-ink-200 pt-4">
                  <div>
                    <p className="text-sm font-medium text-ink-800">
                      Who must sign this version?
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      You can edit this because you are {isUploader ? "the uploader" : "a team admin"}.
                      Removing someone also clears any signature they had already given.
                    </p>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {teamMembers.map((member) => {
                      const checked = selectedSigners.includes(member.userId);
                      return (
                        <label
                          key={member.userId}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                            checked
                              ? "border-sui-300 bg-sui-50"
                              : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSigner(member.userId)}
                            className="h-4 w-4 shrink-0 accent-sui-600"
                          />
                          <Avatar email={member.email} size="sm" />
                          <span className="min-w-0 flex-1 truncate text-xs text-ink-800">
                            {member.email}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit" size="sm" loading={savingSigners}>
                      Save signer set
                    </Button>
                    <span className="text-xs text-ink-500">
                      {selectedSigners.length} selected
                    </span>
                  </div>
                </form>
              )}
            </CardBody>
          </Card>

          {/* Audit */}
          <Card>
            <CardHeader
              icon={<HistoryIcon />}
              title="Audit trail"
              description="Written by the server. Clients cannot add, edit or delete these entries."
            />
            {audit.length === 0 ? (
              <EmptyState icon={<HistoryIcon />} title="No audit entries yet" />
            ) : (
              <ol className="divide-y divide-ink-200">
                {[...audit]
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .map((entry) => (
                    <li key={entry.id} className="flex gap-3 px-5 py-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sui-400" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink-900">
                          <span className="font-medium">{entry.action}</span>
                          <span className="ml-2 text-xs text-ink-400">
                            by user {entry.performedBy}
                          </span>
                        </p>
                        {entry.detail && (
                          <p className="mt-0.5 break-words text-xs leading-relaxed text-ink-500">
                            {entry.detail}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-ink-400" title={formatDateTime(entry.timestamp)}>
                          {timeAgo(entry.timestamp)}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader
              icon={<LayersIcon />}
              title="Version history"
              description="Each version is its own immutable record."
            />
            <ol className="divide-y divide-ink-200">
              {[...versions]
                .sort((a, b) => b.version - a.version)
                .map((version) => {
                  const current = version.id === doc.id;
                  return (
                    <li key={version.id}>
                      <Link
                        href={`/documents/${version.id}`}
                        aria-current={current ? "page" : undefined}
                        className={`block px-5 py-3 transition-colors ${
                          current ? "bg-sui-50" : "hover:bg-ink-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${current ? "text-sui-800" : "text-ink-800"}`}
                          >
                            Version {version.version}
                          </span>
                          {current && <Badge tone="blue">Viewing</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-500">{version.filename}</p>
                        <code className="mt-1 block font-mono text-[11px] text-ink-400">
                          {shortHash(version.documentHash, 8)}
                        </code>
                      </Link>
                    </li>
                  );
                })}
            </ol>
          </Card>

          <Card className="h-fit">
            <CardHeader
              icon={<UploadIcon />}
              title="Amend"
              description="Uploads a replacement as a new version. The current version stays untouched."
            />
            <CardBody>
              <form onSubmit={handleAmend} className="space-y-3">
                <FileDrop
                  file={amendFile}
                  onFile={setAmendFile}
                  disabled={amending}
                  label="Drop the revised PDF"
                />
                <Alert tone="info">
                  The new version gets its own hash and starts with a clean slate: signers carry
                  over, but every signature resets to unsigned.
                </Alert>
                <Button
                  type="submit" fullWidth variant="secondary"
                  loading={amending} disabled={!amendFile}
                >
                  {amending ? "Creating version…" : `Create version ${doc.version + 1}`}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSign}
        tone="primary"
        title={`Sign version ${doc.version}?`}
        description={`Your signature is bound to digest ${shortHash(doc.documentHash, 8)}. It applies to this version only and cannot be undone from here.`}
        confirmLabel="Sign document"
        busy={signing}
        onConfirm={handleSign}
        onCancel={() => setConfirmSign(false)}
      />
    </div>
  );
}

export default function DocumentDetailPage() {
  return (
    <RequireAuth>
      <DocumentDetailContent />
    </RequireAuth>
  );
}
