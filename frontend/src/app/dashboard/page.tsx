"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import * as api from "@/lib/api";
import { ApiError, DocumentResponse, TeamResponse } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import PageHeader from "@/components/PageHeader";
import DocumentRow from "@/components/DocumentRow";
import Card, { CardHeader } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { LinkButton } from "@/components/ui/Button";
import { RoleBadge } from "@/components/ui/Badge";
import {
  CheckCircleIcon, ChevronRightIcon, FileIcon, PenIcon, PlusIcon, UsersIcon,
} from "@/components/ui/Icons";

/** Cap the fan-out when checking which pending documents need *your* signature. */
const PENDING_LOOKUP_LIMIT = 25;

function StatTile({
  icon, label, value, tone = "blue",
}: { icon: React.ReactNode; label: string; value: number | string; tone?: "blue" | "amber" | "green" }) {
  const tones = {
    blue: "bg-sui-50 text-sui-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm shadow-ink-900/[0.03]">
      <span className={`grid h-8 w-8 place-items-center rounded-lg text-base ${tones[tone]}`}>
        {icon}
      </span>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink-950">{value}</p>
      <p className="mt-0.5 text-xs text-ink-500">{label}</p>
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [awaitingMe, setAwaitingMe] = useState<DocumentResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [teamList, docList] = await Promise.all([api.listTeams(), api.listAllDocuments()]);
      setTeams(teamList);
      setDocuments(docList);

      // "Awaiting my signature" is not a server endpoint, so derive it: for each
      // pending document, check whether this user is an assignee who hasn't signed.
      const pending = docList
        .filter((d) => d.status === "PENDING_SIGNATURES")
        .slice(0, PENDING_LOOKUP_LIMIT);
      const results = await Promise.all(
        pending.map(async (doc) => {
          try {
            const signers = await api.getSigners(doc.id);
            const mine = signers.find((s) => s.signerId === user.id);
            return mine && !mine.signed ? doc : null;
          } catch {
            return null; // A document we can see but whose signers we cannot read.
          }
        }),
      );
      setAwaitingMe(results.filter((d): d is DocumentResponse => d !== null));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Attest keeps its JWT in localStorage, so data has to be fetched client-side
  // after mount rather than in a server component. Every setState in `load` runs
  // after an await, which the lint rule cannot see through.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const teamName = (teamId: number) => teams.find((t) => t.id === teamId)?.name;
  const recent = [...documents]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);
  const fullySigned = documents.filter((d) => d.status === "FULLY_SIGNED").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back`}
        description={user?.email}
        action={<LinkButton href="/teams" size="sm" icon={<PlusIcon />}>New team</LinkButton>}
      />

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<UsersIcon />} label="Teams" value={loading ? "—" : teams.length} />
        <StatTile icon={<FileIcon />} label="Documents" value={loading ? "—" : documents.length} />
        <StatTile icon={<PenIcon />} label="Awaiting you" value={loading ? "—" : awaitingMe.length} tone="amber" />
        <StatTile icon={<CheckCircleIcon />} label="Fully signed" value={loading ? "—" : fullySigned} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Needs your signature — the one thing a signer logs in to do. */}
          <Card>
            <CardHeader
              icon={<PenIcon />}
              title="Waiting for your signature"
              description="Versions where you are a required signer and have not signed yet."
            />
            {loading ? (
              <SkeletonRows rows={2} />
            ) : awaitingMe.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon />}
                title="Nothing is waiting on you"
                description="When someone assigns you as a required signer, the document shows up here."
              />
            ) : (
              <ul className="divide-y divide-ink-200">
                {awaitingMe.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} teamName={teamName(doc.teamId)} />
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              icon={<FileIcon />}
              title="Recent documents"
              description="The newest versions across every team you belong to."
              action={
                documents.length > 0 ? (
                  <Link href="/documents" className="text-xs font-medium text-sui-700 hover:underline">
                    View all
                  </Link>
                ) : undefined
              }
            />
            {loading ? (
              <SkeletonRows rows={3} />
            ) : recent.length === 0 ? (
              <EmptyState
                icon={<FileIcon />}
                title="No documents yet"
                description="Documents live inside a team. Create or join a team, then upload your first file."
                action={<LinkButton href="/teams" size="sm" variant="secondary">Go to teams</LinkButton>}
              />
            ) : (
              <ul className="divide-y divide-ink-200">
                {recent.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} teamName={teamName(doc.teamId)} />
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader icon={<UsersIcon />} title="Your teams" />
          {loading ? (
            <SkeletonRows rows={2} />
          ) : teams.length === 0 ? (
            <EmptyState
              icon={<UsersIcon />}
              title="No teams yet"
              description="Create a team to start uploading documents. You become its first team admin."
              action={<LinkButton href="/teams" size="sm">Create a team</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-ink-200">
              {teams.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/teams/${team.id}`}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900 group-hover:text-sui-700">
                        {team.name}
                      </p>
                      <div className="mt-1"><RoleBadge role={team.yourRole} /></div>
                    </div>
                    <ChevronRightIcon className="text-base text-ink-300 transition-colors group-hover:text-sui-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
