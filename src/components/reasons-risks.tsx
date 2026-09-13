import { AlertTriangle, CircleCheck } from "lucide-react";

/**
 * "The system should provide recommendations and clearly flag uncertainty
 * rather than silently making assumptions." (Important Factors.md) - reasons
 * and risks render together, in that order, always both when either exists.
 * Never a reasons-only view that quietly drops the caveats.
 */
export function ReasonsRisks({ reasons, risks }: { reasons: string[]; risks: string[] }) {
  if (reasons.length === 0 && risks.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reasons.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {reasons.map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-ink">
              <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-buy" aria-hidden />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
      {risks.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {risks.map((risk, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-risk" aria-hidden />
              <span>{risk}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
