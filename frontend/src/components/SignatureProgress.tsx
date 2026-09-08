/** Compact "3 of 5 signed" meter used on document cards and the detail page. */
export default function SignatureProgress({
  signed, total, className = "",
}: { signed: number; total: number; className?: string }) {
  if (total === 0) {
    return <p className={`text-xs text-ink-500 ${className}`}>No signers assigned yet</p>;
  }
  const pct = Math.round((signed / total) * 100);
  const complete = signed === total;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-700">
          {signed} of {total} signed
        </span>
        <span className={complete ? "font-medium text-emerald-600" : "text-ink-500"}>{pct}%</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-ink-200"
        role="progressbar"
        aria-valuenow={signed}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${signed} of ${total} required signatures collected`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${complete ? "bg-emerald-500" : "bg-sui-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
