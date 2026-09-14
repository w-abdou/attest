"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, DocumentResponse, TeamMemberResponse, TeamResponse, TeamRole } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import PageHeader from "@/components/PageHeader";
import DocumentRow from "@/components/DocumentRow";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ui/EmptyState";
import FileDrop from "@/components/ui/FileDrop";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { RoleBadge } from "@/components/ui/Badge";
import { InlineSelect } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { FileIcon, PlusIcon, TrashIcon, UploadIcon, UsersIcon } from "@/components/ui/Icons";
import { displayIdentity, shortHash } from "@/lib/format";

const TEAM_ROLES: { value: TeamRole; label: string; blurb: string }[] = [
  { value: "TEAM_VIEWER", label: "Viewer", blurb: "View and verify documents only" },
  { value: "TEAM_SIGNER", label: "Signer", blurb: "Also upload and amend documents" },
  { value: "TEAM_ADMIN", label: "Team admin", blurb: "Also manage members and signer sets" },
];

function TeamDetailContent() {
  const params = useParams<{ id: string }>();
  const teamId = Number(params.id);
  const { user } = useAuth();
  const toast = useToast();

  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [members, setMembers] = useState<TeamMemberResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [newIdentifier, setNewIdentifier] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("TEAM_SIGNER");
  const [addingMember, setAddingMember] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const [pendingRemoval, setPendingRemoval] = useState<TeamMemberResponse | null>(null);
  const [removing, setRemoving] = useState(false);

  const myRole = team?.yourRole;
  const isTeamAdmin = myRole === "TEAM_ADMIN";
  const canUpload = myRole === "TEAM_ADMIN" || myRole === "TEAM_SIGNER";

  const load = useCallback(async () => {
    try {
      // listTeams is the only endpoint that reports *your* role in a team, and
      // its absence from the list is also the "not a member" signal.
      const teams = await api.listTeams();
      const found = teams.find((t) => t.id === teamId) ?? null;
      setTeam(found);
      if (!found) {
        setLoadError("You are not a member of this team, or it does not exist.");
        return;
      }
      const [memberList, docList] = await Promise.all([
        api.listMembers(teamId),
        api.listTeamDocuments(teamId),
      ]);
      setMembers(memberList);
      setDocuments(docList);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Could not load this team.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const validId = !Number.isNaN(teamId);
  // Attest keeps its JWT in localStorage, so data has to be fetched client-side
  // after mount rather than in a server component. Every setState in `load` runs
  // after an await, which the lint rule cannot see through.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (validId) load(); }, [validId, load]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    const identifier = newIdentifier.trim();
    if (!identifier) return;
    setAddingMember(true);
    try {
      await api.addMember(teamId, identifier, newRole);
      setNewIdentifier("");
      toast.success(`${identifier} added to ${team?.name}.`);
      await load();
    } catch (err) {
      toast.error(
          err instanceof ApiError
              ? err.message
              : "Could not add that member. They need an Attest account first.",
      );
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRoleChange(member: TeamMemberResponse, role: TeamRole) {
    try {
      await api.updateMemberRole(teamId, member.userId, role);
      toast.success(`${displayIdentity(member.email, member.suiAddress)} is now ${TEAM_ROLES.find((r) => r.value === role)?.label}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not change that role.");
      await load(); // Snap the select back to the server's truth.
    }
  }

  async function confirmRemove() {
    if (!pendingRemoval) return;
    setRemoving(true);
    try {
      await api.removeMember(teamId, pendingRemoval.userId);
      toast.success(`${displayIdentity(pendingRemoval.email, pendingRemoval.suiAddress)} removed from ${team?.name}.`);
      setPendingRemoval(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove that member.");
    } finally {
      setRemoving(false);
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadToTeam(teamId, file);
      setFile(null);
      setShowUpload(false);
      toast.success(`${uploaded.filename} uploaded as version ${uploaded.version}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  if (!validId) {
    return (
        <div className="animate-fade-in">
          <PageHeader title="Team unavailable" backHref="/teams" backLabel="All teams" />
          <Alert tone="error">That team id is not valid.</Alert>
        </div>
    );
  }

  if (loading) {
    return (
        <div className="space-y-6">
          <div className="skeleton h-8 w-52 rounded-lg" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2"><Card><SkeletonRows rows={3} /></Card></div>
            <Card><SkeletonRows rows={3} /></Card>
          </div>
        </div>
    );
  }

  if (loadError || !team) {
    return (
        <div className="animate-fade-in">
          <PageHeader title="Team unavailable" backHref="/teams" backLabel="All teams" />
          <Alert tone="error">{loadError ?? "Could not load this team."}</Alert>
        </div>
    );
  }

  return (
      <div className="animate-fade-in space-y-6">
        <PageHeader
            title={team.name}
            backHref="/teams"
            backLabel="All teams"
            badge={<RoleBadge role={team.yourRole} />}
            description={`${members.length} member${members.length === 1 ? "" : "s"} · ${documents.length} document${documents.length === 1 ? "" : "s"}`}
        />

        <div className="grid items-start gap-6 lg:grid-cols-3">
          {/* LEFT (primary): documents — the anchor the eye should land on first. */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              {/* Tinted header band gives the primary card visual weight. */}
              <div className="flex items-center justify-between gap-4 rounded-t-xl border-b border-sui-100 bg-gradient-to-r from-sui-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sui-600 text-white shadow-sm shadow-sui-600/30">
                  <FileIcon />
                </span>
                  <div>
                    <h2 className="text-sm font-semibold text-ink-900">Team documents</h2>
                    <p className="text-xs text-ink-500">Every member can open and verify · signers &amp; admins can add</p>
                  </div>
                </div>
                {canUpload && (
                    <Button
                        size="sm"
                        variant={showUpload ? "secondary" : "primary"}
                        icon={showUpload ? undefined : <UploadIcon />}
                        onClick={() => { setShowUpload((v) => !v); setFile(null); }}
                    >
                      {showUpload ? "Cancel" : "Upload"}
                    </Button>
                )}
              </div>

              {canUpload && showUpload && (
                  <CardBody className="border-b border-ink-200 bg-ink-50/60">
                    <form onSubmit={handleUpload} className="space-y-3">
                      <FileDrop
                          file={file}
                          onFile={setFile}
                          disabled={uploading}
                          hint="PDF — creates version 1 and records its SHA-256 digest"
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => { setShowUpload(false); setFile(null); }}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" loading={uploading} disabled={!file} icon={<UploadIcon />}>
                          {uploading ? "Uploading…" : "Upload"}
                        </Button>
                      </div>
                    </form>
                  </CardBody>
              )}

              {documents.length === 0 ? (
                  <EmptyState
                      icon={<FileIcon />}
                      title="No documents yet"
                      description={
                        canUpload
                            ? "Click Upload above to add the first PDF and create version 1."
                            : "Your team role is Viewer, so a signer or team admin needs to upload the first document."
                      }
                  />
              ) : (
                  <ul className="divide-y divide-ink-200">
                    {documents.map((doc) => (
                        <DocumentRow key={doc.id} doc={doc} />
                    ))}
                  </ul>
              )}
            </Card>

            {!canUpload && (
                <Alert tone="info" title="Your team role is Viewer">
                  You can open and verify every document in this team, but cannot upload or amend.
                  A team admin can change your role from the members panel.
                </Alert>
            )}
          </div>

          {/* RIGHT (secondary): members — narrow column, tighter rows. */}
          <div>
            <Card className="lg:sticky lg:top-6">
              <CardHeader
                  icon={<UsersIcon />}
                  title="Members"
                  description={`${members.length} in this team`}
              />
              <ul className="divide-y divide-ink-100">
                {members.map((member) => {
                  const isMe = member.userId === user?.id;
                  return (
                      <li key={member.userId} className="px-4 py-3 transition-colors hover:bg-ink-50/60">
                        <div className="flex items-center gap-2.5">
                          <Avatar identity={displayIdentity(member.email, member.suiAddress)} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink-900">
                              {member.email ?? shortHash(member.suiAddress ?? "", 6)}
                              {isMe && <span className="ml-1 text-xs font-normal text-ink-400">(you)</span>}
                            </p>
                            {member.email && (
                                <p className="truncate text-xs text-ink-400">{member.email}</p>
                            )}
                          </div>
                          {!isTeamAdmin && <RoleBadge role={member.teamRole} />}
                        </div>
                        {isTeamAdmin && (
                            <div className="mt-2 flex items-center gap-1.5 pl-[42px]">
                              <InlineSelect
                                  aria-label={`Team role for ${displayIdentity(member.email, member.suiAddress)}`}
                                  value={member.teamRole}
                                  onChange={(e) => handleRoleChange(member, e.target.value as TeamRole)}
                                  className="flex-1"
                              >
                                {TEAM_ROLES.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </InlineSelect>
                              <button
                                  onClick={() => setPendingRemoval(member)}
                                  aria-label={`Remove ${displayIdentity(member.email, member.suiAddress)}`}
                                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <TrashIcon className="text-sm" />
                              </button>
                            </div>
                        )}
                      </li>
                  );
                })}
              </ul>

              {isTeamAdmin && (
                  <CardBody className="border-t border-ink-200 bg-ink-50/60">
                    <form onSubmit={handleAddMember} className="space-y-2">
                      <label htmlFor="add-member-identifier" className="block text-xs font-medium text-ink-700">
                        Add a member by email or Sui address
                      </label>
                      <input
                          id="add-member-identifier"
                          type="text"
                          value={newIdentifier}
                          onChange={(e) => setNewIdentifier(e.target.value)}
                          placeholder="person@company.com or 0x…"
                          className="h-9 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm placeholder:text-ink-400 transition-colors hover:border-ink-400 focus:border-sui-400 focus:outline-none focus:ring-4 focus:ring-sui-400/15"
                      />
                      <div className="flex items-center gap-1.5">
                        <InlineSelect
                            aria-label="Team role for the new member"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as TeamRole)}
                            className="h-9 flex-1"
                        >
                          {TEAM_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </InlineSelect>
                        <Button
                            type="submit" size="sm" className="h-9"
                            loading={addingMember} disabled={!newIdentifier.trim()} icon={<PlusIcon />}
                        >
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-ink-500">
                        Must already have an Attest account.
                      </p>
                    </form>
                  </CardBody>
              )}
            </Card>
          </div>
        </div>

        <ConfirmDialog
            open={pendingRemoval !== null}
            title={`Remove ${pendingRemoval ? displayIdentity(pendingRemoval.email, pendingRemoval.suiAddress) : "member"}?`}
            description="They lose access to every document in this team immediately. Signatures they have already recorded are kept."
            confirmLabel="Remove member"
            busy={removing}
            onConfirm={confirmRemove}
            onCancel={() => setPendingRemoval(null)}
        />
      </div>
  );
}

export default function TeamDetailPage() {
  return (
      <RequireAuth>
        <TeamDetailContent />
      </RequireAuth>
  );
}