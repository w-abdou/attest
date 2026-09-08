"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { ApiError, DocumentResponse, TeamResponse } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import PageHeader from "@/components/PageHeader";
import DocumentRow from "@/components/DocumentRow";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { LinkButton } from "@/components/ui/Button";
import { InlineSelect } from "@/components/ui/Field";
import { FileIcon } from "@/components/ui/Icons";
import { STATUS_LABEL } from "@/lib/format";

const STATUSES = ["DRAFT", "PENDING_SIGNATURES", "FULLY_SIGNED", "REVOKED"];

function DocumentsContent() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const [docList, teamList] = await Promise.all([api.listAllDocuments(), api.listTeams()]);
      setDocuments(docList);
      setTeams(teamList);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Attest keeps its JWT in localStorage, so data has to be fetched client-side
  // after mount rather than in a server component. Every setState in `load` runs
  // after an await, which the lint rule cannot see through.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const teamName = (teamId: number) => teams.find((t) => t.id === teamId)?.name;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents
      .filter((d) => (teamFilter === "all" ? true : d.teamId === Number(teamFilter)))
      .filter((d) => (statusFilter === "all" ? true : d.status === statusFilter))
      .filter((d) =>
        needle === ""
          ? true
          : d.filename.toLowerCase().includes(needle) ||
            d.documentHash.toLowerCase().startsWith(needle),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, query, teamFilter, statusFilter]);

  const filtered = visible.length !== documents.length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Documents"
        description="Every document across the teams you belong to."
      />

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by filename or hash prefix…"
          aria-label="Search documents"
          className="h-9 min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-400 focus:border-sui-400 focus:outline-none focus:ring-4 focus:ring-sui-400/15 sm:max-w-xs"
        />
        <InlineSelect
          aria-label="Filter by team"
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="h-9"
        >
          <option value="all">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </InlineSelect>
        <InlineSelect
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9"
        >
          <option value="all">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </InlineSelect>
        <span className="ml-auto text-xs text-ink-500">
          {loading ? "" : `${visible.length} of ${documents.length}`}
        </span>
      </div>

      <Card>
        {loading ? (
          <SkeletonRows rows={5} />
        ) : visible.length === 0 ? (
          filtered || query ? (
            <EmptyState
              icon={<FileIcon />}
              title="No documents match those filters"
              description="Try clearing the search box or widening the team and status filters."
            />
          ) : (
            <EmptyState
              icon={<FileIcon />}
              title="No documents yet"
              description="Documents belong to a team. Open a team you can upload to and add your first file."
              action={<LinkButton href="/teams" size="sm">Go to teams</LinkButton>}
            />
          )
        ) : (
          <ul className="divide-y divide-ink-200">
            {visible.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} teamName={teamName(doc.teamId)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <RequireAuth>
      <DocumentsContent />
    </RequireAuth>
  );
}
