import { avatarTint, initials } from "@/lib/format";

export default function Avatar({ identity, size = "md" }: { identity: string; size?: "sm" | "md" }) {
  const dimensions = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <span
      title={identity}
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${dimensions} ${avatarTint(identity)}`}
    >
      {initials(identity)}
    </span>
  );
}
