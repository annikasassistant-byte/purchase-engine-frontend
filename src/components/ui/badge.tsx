import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "buy" | "consider" | "skip" | "risk" | "accent" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  buy: "bg-buy-soft text-buy",
  consider: "bg-consider-soft text-consider",
  skip: "bg-skip-soft text-skip",
  risk: "bg-risk-soft text-risk",
  accent: "bg-accent-soft text-accent-ink",
  neutral: "bg-surface-2 text-muted",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium leading-5 whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
