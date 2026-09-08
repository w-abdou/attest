"use client";

import { useEffect, useRef } from "react";
import Button, { buttonClass } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal confirmation for actions that destroy state. Focus lands on Cancel —
 * the safe choice — and Escape or a backdrop click dismisses it.
 */
export default function ConfirmDialog({
  open, title, description, confirmLabel = "Confirm",
  tone = "danger", busy = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="animate-fade-in absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-rise relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl shadow-ink-950/20"
      >
        <h2 id="confirm-title" className="text-sm font-semibold text-ink-900">{title}</h2>
        {description && <p className="mt-1.5 text-xs leading-relaxed text-ink-600">{description}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={buttonClass("secondary", "sm")}
          >
            Cancel
          </button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            size="sm"
            loading={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
