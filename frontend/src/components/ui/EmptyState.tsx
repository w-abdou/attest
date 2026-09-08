export default function EmptyState({
  icon, title, description, action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon && (
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-100 text-xl text-ink-400">
          {icon}
        </span>
      )}
      <div>
        <p className="text-sm font-medium text-ink-800">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
