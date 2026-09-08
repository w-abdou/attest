"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertIcon, CheckCircleIcon, CloseIcon, InfoIcon } from "./Icons";

type ToastTone = "success" | "error" | "info";
interface Toast { id: number; tone: ToastTone; message: string; }

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TONE_STYLES: Record<ToastTone, { ring: string; icon: React.ReactNode }> = {
  success: { ring: "ring-emerald-200", icon: <CheckCircleIcon className="text-base text-emerald-600" /> },
  error: { ring: "ring-red-200", icon: <AlertIcon className="text-base text-red-600" /> },
  info: { ring: "ring-sui-200", icon: <InfoIcon className="text-base text-sui-600" /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    timers.current.push(setTimeout(() => dismiss(id), 4500));
  }, [dismiss]);

  // Clear any still-pending dismiss timers if the provider unmounts.
  useEffect(() => {
    const pending = timers;
    return () => pending.current.forEach(clearTimeout);
  }, []);

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error = useCallback((message: string) => toast(message, "error"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`animate-toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl bg-white px-3.5 py-3 shadow-lg shadow-ink-900/10 ring-1 ${TONE_STYLES[t.tone].ring}`}
          >
            <span className="mt-px shrink-0">{TONE_STYLES[t.tone].icon}</span>
            <p className="flex-1 text-xs leading-relaxed text-ink-800">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded text-ink-400 transition-colors hover:text-ink-700"
            >
              <CloseIcon className="text-sm" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
