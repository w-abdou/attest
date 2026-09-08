import { AlertIcon, CheckCircleIcon, InfoIcon } from "./Icons";

type Tone = "error" | "success" | "info";

const TONES: Record<Tone, { box: string; icon: React.ReactNode }> = {
  error: {
    box: "border-red-200 bg-red-50 text-red-800",
    icon: <AlertIcon className="text-base text-red-600" />,
  },
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <CheckCircleIcon className="text-base text-emerald-600" />,
  },
  info: {
    box: "border-sui-200 bg-sui-50 text-sui-900",
    icon: <InfoIcon className="text-base text-sui-600" />,
  },
};

export default function Alert({
  tone = "info", title, children, className = "",
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 ${TONES[tone].box} ${className}`}
    >
      <span className="mt-px shrink-0">{TONES[tone].icon}</span>
      <div className="min-w-0 flex-1 text-xs leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  );
}
