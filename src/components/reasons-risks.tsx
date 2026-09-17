import { AlertTriangle, CircleCheck, Info } from "lucide-react";

/**
 * "The system should provide recommendations and clearly flag uncertainty
 * rather than silently making assumptions." (Important Factors.md) - reasons
 * and risks render together, in that order, always both when either exists.
 * Never a reasons-only view that quietly drops the caveats.
 */

/**
 * `reasons` is a flat `string[]` from the backend with no structural tag for
 * "this one's a neutral disclosure, not an endorsement" - purchase_engine's
 * ExplanationGenerator (pipeline/explain.py) unconditionally appends this
 * exact line to every recommendation's positive-reasons list, deliberately
 * ("always a positive, never a penalty" per its own comment: missing
 * Keepa/Back Market data doesn't hurt the score, so it isn't framed as a
 * risk either). A green checkmark next to "No Keepa..." still reads as a
 * contradiction though, so it gets a neutral icon instead of the reasons
 * list's default green one. This is a text match against a backend-owned
 * string, not a structural signal - if that wording ever changes, update
 * this alongside it (or, better, give the backend a real third category).
 */
const NEUTRAL_REASON_PREFIXES = ["No Keepa / Back Market rank"];

function isNeutralReason(reason: string): boolean {
  return NEUTRAL_REASON_PREFIXES.some((prefix) => reason.startsWith(prefix));
}

export function ReasonsRisks({ reasons, risks }: { reasons: string[]; risks: string[] }) {
  if (reasons.length === 0 && risks.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reasons.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {reasons.map((reason, i) =>
            isNeutralReason(reason) ? (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <Info className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
                <span>{reason}</span>
              </li>
            ) : (
              <li key={i} className="flex items-start gap-2 text-sm text-ink">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-buy" aria-hidden />
                <span>{reason}</span>
              </li>
            ),
          )}
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
