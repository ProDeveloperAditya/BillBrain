import { Skeleton } from "@/components/ui/skeleton";

function Section({ label, rows }: { label: string; rows: number }) {
  return (
    <div className="surface-2 border border-border rounded-2xl p-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="space-y-1">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Section label="Profile" rows={2} />
      <Section label="Preferences" rows={2} />
      <Section label="AI Provider" rows={2} />
      <Section label="Data" rows={1} />
    </div>
  );
}
