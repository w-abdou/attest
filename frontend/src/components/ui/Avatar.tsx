import { avatarTint, initials } from "@/lib/format";

export default function Avatar({ email, size = "md" }: { email: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <span
      title={email}
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${dimensions} ${avatarTint(email)}`}
    >
      {initials(email)}
    </span>
  );
}
