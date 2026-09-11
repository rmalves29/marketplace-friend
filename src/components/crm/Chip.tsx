import { cn } from "@/lib/utils";

export function Chip({
  label,
  token,
  className,
}: {
  label: string;
  token?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        token ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
