"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./Icons";
import { shortHash } from "@/lib/format";

/**
 * A SHA-256 digest is the thing a reviewer actually compares by eye, so show it
 * truncated with the full value one click away on the clipboard.
 */
export default function HashDisplay({
  hash, label = "SHA-256", full = false,
}: { hash: string; label?: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard is unavailable over plain HTTP on some browsers; the full
      // digest is still selectable via the title attribute.
    }
  }

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 py-1 pl-2.5 pr-1">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        {label}
      </span>
      <code
        title={hash}
        className={`font-mono text-xs text-ink-700 ${full ? "break-all" : "truncate"}`}
      >
        {full ? hash : shortHash(hash)}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : `Copy ${label} to clipboard`}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-white hover:text-sui-600"
      >
        {copied ? <CheckIcon className="text-sm text-emerald-600" /> : <CopyIcon className="text-sm" />}
      </button>
    </div>
  );
}
