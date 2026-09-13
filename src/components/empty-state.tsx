import { RunTriggerButton } from "@/components/run-trigger-button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-16 text-center">
      <div>
        <p className="font-medium text-ink">No runs yet</p>
        <p className="mt-1 text-sm text-muted">
          Run the engine to get today&apos;s buy list.
        </p>
      </div>
      <RunTriggerButton budget={1500} />
    </div>
  );
}
