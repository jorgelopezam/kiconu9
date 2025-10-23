interface ProgressCardProps {
  title: string;
  progress: number;
}

export function ProgressCard({ title, progress }: ProgressCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-panel-border bg-panel-card p-4">
      <div className="flex items-center justify-between gap-6">
        <p className="text-base font-medium leading-normal text-panel-text">
          {title}
        </p>
        <p className="text-lg font-bold leading-normal text-panel-primary">
          {progress}%
        </p>
      </div>
      <div className="rounded-full bg-panel-border">
        <div
          className="h-2.5 rounded-full bg-panel-primary"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
