/** Presentation-only helpers. Nothing here talks to the API. */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000], ["month", 2592000], ["week", 604800],
  ["day", 86400], ["hour", 3600], ["minute", 60],
];

/** "3 hours ago" — falls back to "just now" under a minute. */
export function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, secondsPerUnit] of UNITS) {
    if (seconds >= secondsPerUnit) {
      return rtf.format(-Math.floor(seconds / secondsPerUnit), unit);
    }
  }
  return "just now";
}

/** 64 hex chars is unreadable in full; show the ends and keep the middle out. */
export function shortHash(hash: string, edge = 10): string {
  if (hash.length <= edge * 2 + 1) return hash;
  return `${hash.slice(0, edge)}…${hash.slice(-edge)}`;
}

/**
 * Every account has a username once onboarding completes, so this is what
 * almost every caller sees in practice — but it stays defensive for the brief
 * window between a brand-new account's first login and choosing one (or a
 * legacy pre-migration row), when it may still be null: falls back to email,
 * then a shortened address, then a plain placeholder.
 */
export function displayIdentity(
  username: string | null, email: string | null, suiAddress: string | null,
): string {
  if (username) return `@${username}`;
  if (email) return email;
  if (suiAddress) return shortHash(suiAddress, 6);
  return "Unknown user";
}

export function initials(identity: string): string {
  if (identity.startsWith("@")) return identity.slice(1, 3).toUpperCase();
  if (identity.startsWith("0x")) return identity.slice(2, 4).toUpperCase();
  const name = identity.split("@")[0] ?? identity;
  const parts = name.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Deterministic avatar tint so the same identity keeps the same colour. */
export function avatarTint(identity: string): string {
  const tints = [
    "bg-sui-100 text-sui-800", "bg-emerald-100 text-emerald-800",
    "bg-amber-100 text-amber-800", "bg-violet-100 text-violet-800",
    "bg-rose-100 text-rose-800", "bg-cyan-100 text-cyan-800",
  ];
  let hash = 0;
  for (let i = 0; i < identity.length; i++) hash = (hash * 31 + identity.charCodeAt(i)) | 0;
  return tints[Math.abs(hash) % tints.length];
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin", SIGNER: "Signer", VIEWER: "Viewer",
  TEAM_ADMIN: "Team admin", TEAM_SIGNER: "Signer", TEAM_VIEWER: "Viewer",
};

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_SIGNATURES: "Awaiting signatures",
  FULLY_SIGNED: "Fully signed",
  REVOKED: "Revoked",
};
