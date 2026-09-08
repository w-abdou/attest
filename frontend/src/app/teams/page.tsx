"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as api from "@/lib/api";
import { ApiError, TeamResponse } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import PageHeader from "@/components/PageHeader";
import Card, { CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { RoleBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "@/components/ui/Icons";
import { timeAgo } from "@/lib/format";

function TeamsContent() {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setTeams(await api.listTeams());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your teams.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Attest keeps its JWT in localStorage, so data has to be fetched client-side
  // after mount rather than in a server component. Every setState in `load` runs
  // after an await, which the lint rule cannot see through.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const team = await api.createTeam(trimmed);
      setName("");
      toast.success(`Team “${team.name}” created — you are its team admin.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create the team.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Teams"
        description="Documents are owned by teams, and your role in each team decides what you can do there."
      />

      {error && <Alert tone="error" className="mb-6">{error}</Alert>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader icon={<UsersIcon />} title="Your teams" />
            {loading ? (
              <SkeletonRows rows={3} />
            ) : teams.length === 0 ? (
              <EmptyState
                icon={<UsersIcon />}
                title="You are not in any team yet"
                description="Create one to get started, or ask a team admin to add you by email."
              />
            ) : (
              <ul className="divide-y divide-ink-200">
                {teams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`/teams/${team.id}`}
                      className="group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-ink-50"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sui-50 text-base text-sui-600">
                        <UsersIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-900 group-hover:text-sui-700">
                          {team.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-500">Created {timeAgo(team.createdAt)}</p>
                      </div>
                      <RoleBadge role={team.yourRole} />
                      <ChevronRightIcon className="shrink-0 text-base text-ink-300 transition-colors group-hover:text-sui-500" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader
            icon={<PlusIcon />}
            title="Create a team"
            description="You become this team's first team admin."
          />
          <CardBody>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Legal"
                aria-label="Team name"
                maxLength={80}
                className="h-10 w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 transition-colors hover:border-ink-400 focus:border-sui-400 focus:outline-none focus:ring-4 focus:ring-sui-400/15"
              />
              <Button type="submit" fullWidth loading={creating} disabled={!name.trim()} icon={<PlusIcon />}>
                Create team
              </Button>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              As team admin you can add members by email, set each person&apos;s team role, and
              decide who must sign a document.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default function TeamsPage() {
  return (
    <RequireAuth>
      <TeamsContent />
    </RequireAuth>
  );
}
