interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <section
      {...rest}
      className={`rounded-xl border border-ink-200 bg-white shadow-sm shadow-ink-900/[0.03] ${className}`}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, icon, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-ink-200 px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sui-50 text-base text-sui-600">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}
