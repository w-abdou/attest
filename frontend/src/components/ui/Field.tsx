"use client";

import { useId, useState } from "react";
import { EyeIcon, EyeOffIcon } from "./Icons";

const CONTROL =
  "w-full rounded-lg border border-ink-300 bg-white px-3 text-sm text-ink-900 " +
  "placeholder:text-ink-400 transition-colors hover:border-ink-400 " +
  "focus:border-sui-400 focus:outline-none focus:ring-4 focus:ring-sui-400/15 " +
  "disabled:bg-ink-50 disabled:text-ink-500";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor: string;
  children: React.ReactNode;
}

function FieldShell({ label, hint, error, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function Input({ label, hint, error, id, className = "", ...rest }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <input
        {...rest}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={`${CONTROL} h-10 ${error ? "border-red-300 focus:border-red-400 focus:ring-red-400/15" : ""} ${className}`}
      />
    </FieldShell>
  );
}

/** Password input with a show/hide toggle — reduces typo-driven login failures. */
export function PasswordInput({ label, hint, error, id, className = "", ...rest }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const [visible, setVisible] = useState(false);
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={inputId}>
      <div className="relative">
        <input
          {...rest}
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          className={`${CONTROL} h-10 pr-10 ${error ? "border-red-300 focus:border-red-400 focus:ring-red-400/15" : ""} ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
        >
          {visible ? <EyeOffIcon className="text-base" /> : <EyeIcon className="text-base" />}
        </button>
      </div>
    </FieldShell>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string | null;
}

export function Select({ label, hint, error, id, className = "", children, ...rest }: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <FieldShell label={label} hint={hint} error={error} htmlFor={selectId}>
      <select {...rest} id={selectId} className={`${CONTROL} h-10 cursor-pointer ${className}`}>
        {children}
      </select>
    </FieldShell>
  );
}

/** Bare select for inline use inside table rows, where a label would be noise. */
export function InlineSelect({
  className = "", "aria-label": ariaLabel, children, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      aria-label={ariaLabel}
      className={`h-8 cursor-pointer rounded-lg border border-ink-300 bg-white px-2 text-xs text-ink-800 transition-colors hover:border-ink-400 focus:border-sui-400 focus:outline-none focus:ring-4 focus:ring-sui-400/15 ${className}`}
    >
      {children}
    </select>
  );
}
