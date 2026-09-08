"use client";

import { useId, useRef, useState } from "react";
import { CloseIcon, FileIcon, UploadIcon } from "./Icons";
import { formatBytes } from "@/lib/format";

interface FileDropProps {
  file: File | null;
  onFile: (file: File | null) => void;
  accept?: string;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

/**
 * Drag-and-drop file picker that still works as a plain click-to-browse input
 * and stays reachable from the keyboard (the label is the focusable control).
 */
export default function FileDrop({
  file, onFile, accept = "application/pdf",
  label = "Drop a PDF here, or click to browse",
  hint, disabled = false,
}: FileDropProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFile(dropped);
  }

  function clear() {
    onFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-sui-200 bg-sui-50/60 px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-base text-sui-600 ring-1 ring-sui-200">
          <FileIcon />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{file.name}</p>
          <p className="text-xs text-ink-500">{formatBytes(file.size)}</p>
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label={`Remove ${file.name}`}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-400 transition-colors hover:bg-white hover:text-ink-700"
        >
          <CloseIcon className="text-sm" />
        </button>
        <input
          ref={inputRef} id={inputId} type="file" accept={accept} className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef} id={inputId} type="file" accept={accept} disabled={disabled}
        className="peer sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-sui-400/20 ${
          disabled
            ? "cursor-not-allowed border-ink-200 bg-ink-50"
            : dragging
              ? "border-sui-400 bg-sui-50"
              : "border-ink-300 bg-ink-50/50 hover:border-sui-300 hover:bg-sui-50/50"
        }`}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-lg text-sui-600 ring-1 ring-ink-200">
          <UploadIcon />
        </span>
        <span className="text-sm font-medium text-ink-700">{label}</span>
        {hint && <span className="text-xs text-ink-500">{hint}</span>}
      </label>
    </div>
  );
}
