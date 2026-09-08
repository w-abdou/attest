import Link from "next/link";
import { ArrowLeftIcon } from "./ui/Icons";

export default function PageHeader({
  title, description, backHref, backLabel, badge, action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {backHref && (
        <Link
          href={backHref}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-sui-700"
        >
          <ArrowLeftIcon className="text-sm" />
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-ink-950 sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
