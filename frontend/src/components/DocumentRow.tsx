import Link from "next/link";
import { StatusBadge } from "./ui/Badge";
import { ChevronRightIcon, FileIcon } from "./ui/Icons";
import { shortHash, timeAgo } from "@/lib/format";
import type { DocumentResponse } from "@/lib/api";

export default function DocumentRow({
  doc, teamName,
}: { doc: DocumentResponse; teamName?: string }) {
  return (
    <li>
      <Link
        href={`/documents/${doc.id}`}
        className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sui-50 text-base text-sui-600">
          <FileIcon />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900 group-hover:text-sui-700">
            {doc.filename}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
            <span>Version {doc.version}</span>
            <span aria-hidden="true">·</span>
            <span>{timeAgo(doc.createdAt)}</span>
            {teamName && (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{teamName}</span>
              </>
            )}
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <code className="hidden font-mono text-[11px] text-ink-400 sm:inline">
              {shortHash(doc.documentHash, 6)}
            </code>
          </p>
        </div>

        <StatusBadge status={doc.status} />
        <ChevronRightIcon className="shrink-0 text-base text-ink-300 transition-colors group-hover:text-sui-500" />
      </Link>
    </li>
  );
}
