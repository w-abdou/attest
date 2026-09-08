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

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<TeamRole>("TEAM_SIGNER");
  const [addingMember, setAddingMember] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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
    const email = newEmail.trim();
    if (!email) return;
    setAddingMember(true);
    try {
      await api.addMember(teamId, email, newRole);
      setNewEmail("");
      toast.success(`${email} added to ${team?.name}.`);
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
      toast.success(`${member.email} is now ${TEAM_ROLES.find((r) => r.value === role)?.label}.`);
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
      toast.success(`${pendingRemoval.email} removed from ${team?.name}.`);
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
        <Card><SkeletonRows rows={3} /></Card>
        <Card><SkeletonRows rows={2} /></Card>
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
    <div className="animate-fade-in">
      <PageHeader
        title={team.name}
        backHref="/teams"
        backLabel="All teams"
        badge={<RoleBadge role={team.yourRole} />}
        description={`${members.length} member${members.length === 1 ? "" : "s"} · ${documents.length} document${documents.length === 1 ? "" : "s"}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Documents */}
          <Card>
            <CardHeader
              icon={<FileIcon />}
              title="Team documents"
              description="Every member can open and verify these. Only signers and team admins can add new ones."
            />
            {documents.length === 0 ? (
              <EmptyState
                icon={<FileIcon />}
                title="No documents in this team yet"
                description={
                  canUpload
                    ? "Upload a PDF using the panel on the right to create version 1."
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

          {/* Members */}
          <Card>
            <CardHeader
              icon={<UsersIcon />}
              title="Members"
              description="Team roles are read live from the database on every request, so a change takes effect immediately."
            />
            <ul className="divide-y divide-ink-200">
              {members.map((member) => {
                const isMe = member.userId === user?.id;
                return (
                  <li key={member.userId} className="flex items-center gap-3 px-5 py-3">
                    <Avatar email={member.email} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink-900">
                        {member.email}
                        {isMe && <span className="ml-1.5 text-xs text-ink-400">(you)</span>}
                      </p>
                      <p className="text-xs text-ink-400">user id {member.userId}</p>
                    </div>
                    {isTeamAdmin ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <InlineSelect
                          aria-label={`Team role for ${member.email}`}
                          value={member.teamRole}
                          onChange={(e) => handleRoleChange(member, e.target.value as TeamRole)}
                        >
                          {TEAM_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </InlineSelect>
                        <button
                          onClick={() => setPendingRemoval(member)}
                          aria-label={`Remove ${member.email}`}
                          className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <TrashIcon className="text-sm" />
                        </button>
                      </div>
                    ) : (
                      <RoleBadge role={member.teamRole} />
                    )}
                  </li>
                );
              })}
            </ul>

            {isTeamAdmin && (
              <CardBody className="border-t border-ink-200 bg-ink-50/50">
                <form onSubmit={handleAddMember} className="flex flex-wrap items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="add-member-email" className="mb-1 block text-xs font-medium text-ink-700">
                      Add an existing Attest user by email
                    </label>
                    <input
                      id="add-member-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="person@company.com"
                      className="h-9 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm placeholder:text-ink-400 transition-colors hover:border-ink-400 focus:border-sui-400 focus:outline-none focus:ring-4 focus:ring-sui-400/15"
                    />
                  </div>
                  <InlineSelect
                    aria-label="Team role for the new member"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as TeamRole)}
                    className="h-9"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </InlineSelect>
                  <Button
                    type="submit" size="sm" className="h-9"
                    loading={addingMember} disabled={!newEmail.trim()} icon={<PlusIcon />}
                  >
                    Add
                  </Button>
                </form>
                <p className="mt-2 text-xs text-ink-500">
                  {TEAM_ROLES.find((r) => r.value === newRole)?.blurb}. The person must already
                  have registered an Attest account.
                </p>
              </CardBody>
            )}
          </Card>
        </div>

        {/* Upload */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader
              icon={<UploadIcon />}
              title="Upload a document"
              description="Creates version 1 and records its SHA-256 digest."
            />
            <CardBody>
              {canUpload ? (
                <form onSubmit={handleUpload} className="space-y-3">
                  <FileDrop
                    file={file}
                    onFile={setFile}
                    disabled={uploading}
                    hint="PDF, up to your server's upload limit"
                  />
                  <Button type="submit" fullWidth loading={uploading} disabled={!file} icon={<UploadIcon />}>
                    {uploading ? "Uploading…" : "Upload to this team"}
                  </Button>
                </form>
              ) : (
                <Alert tone="info" title="Your team role is Viewer">
                  Viewers can open and verify every document in this team but cannot upload or
                  amend. A team admin can change your role from the members list.
                </Alert>
              )}
            </CardBody>
          </Card>

          <Card className="h-fit">
            <CardHeader title="What each team role can do" />
            <CardBody className="space-y-3">
              {TEAM_ROLES.map((role) => (
                <div key={role.value} className="flex items-start gap-2.5">
                  <RoleBadge role={role.value} />
                  <p className="flex-1 text-xs leading-relaxed text-ink-600">{role.blurb}</p>
                </div>
              ))}
              <p className="border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-500">
                Signing is separate from all of this: only people named in a version&apos;s
                required-signer set can sign it, whatever their team role.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={`Remove ${pendingRemoval?.email}?`}
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
