import { ROLE_LABEL, STATUS_LABEL } from "@/lib/format";

type Tone = "neutral" | "blue" | "green" | "amber" | "red";

const TONES: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
  blue: "bg-sui-50 text-sui-700 ring-sui-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

export default function Badge({
  tone = "neutral", className = "", children,
}: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<string, Tone> = {
  DRAFT: "neutral",
  PENDING_SIGNATURES: "amber",
  FULLY_SIGNED: "green",
  REVOKED: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"}>
      <span
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
        aria-hidden="true"
      />
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

/** TEAM_ADMIN reads as privileged, so it gets the only coloured treatment. */
export function RoleBadge({ role }: { role: string }) {
  const tone: Tone = role === "TEAM_ADMIN" || role === "ADMIN" ? "blue" : "neutral";
  return <Badge tone={tone}>{ROLE_LABEL[role] ?? role}</Badge>;
}
