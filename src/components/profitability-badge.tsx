import { CheckCircle2, CircleHelp, Clock, HelpCircle } from "lucide-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ProfitabilityStatus } from "@/lib/schemas";

/**
 * Annika's own words (docs/conversations/Annika.md): "the frontend could
 * clearly distinguish between: CONFIRMED -> reliable value from the Profit
 * Engine, TEMP_CALCULATED -> temporary calculated estimate, PRÜFEN ->
 * requires manual review, UNAVAILABLE -> insufficient data. This way, we
 * never accidentally present an estimated profitability value as
 * confirmed data." Never collapse this into a single "profitability: OK".
 */
const STATUS_META: Record<
  ProfitabilityStatus,
  { label: string; tone: BadgeTone; icon: typeof CheckCircle2 }
> = {
  CONFIRMED: { label: "Confirmed margin", tone: "buy", icon: CheckCircle2 },
  TEMP_CALCULATED: { label: "Estimated margin", tone: "consider", icon: Clock },
  PRÜFEN: { label: "Needs review", tone: "risk", icon: HelpCircle },
  UNAVAILABLE: { label: "Margin unavailable", tone: "neutral", icon: CircleHelp },
};

export function ProfitabilityBadge({ status }: { status: ProfitabilityStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </Badge>
  );
}
