import { cn } from "@/lib/cn";

/**
 * Purchase Score and Confidence, side by side but never combined - the
 * backend never multiplies them (purchase_engine ADR 0003 / 0008), and
 * Annika's brief says the same from the product side: "I would also like
 * us to keep Purchase Score and Data Confidence separate. A product can
 * still be an attractive purchasing opportunity even if one underlying
 * data component is not fully confirmed." A 92-score/40%-confidence
 * product and a 92-score/95%-confidence product are different situations -
 * one visual block, two independent numbers.
 */
export function ScoreConfidence({
  score,
  confidence,
}: {
  score: number;
  confidence: number;
}) {
  return (
    <div className="flex items-center gap-4">
      <div>
        <div className="font-mono text-2xl font-semibold tabular-nums text-ink">{score}</div>
        <div className="text-[11px] tracking-wide text-muted uppercase">Score</div>
      </div>
      <div className="h-8 w-px bg-border" aria-hidden />
      <div>
        <div
          className={cn(
            "font-mono text-2xl font-semibold tabular-nums",
            confidence >= 70 ? "text-ink" : confidence >= 40 ? "text-consider" : "text-risk",
          )}
        >
          {confidence}%
        </div>
        <div className="text-[11px] tracking-wide text-muted uppercase">Confidence</div>
      </div>
    </div>
  );
}
