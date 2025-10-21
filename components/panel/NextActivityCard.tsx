interface NextActivityCardProps {
  icon: string;
  title: string;
  time: string;
}

export function NextActivityCard({ icon, title, time }: NextActivityCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-panel-border bg-panel-card p-4">
      <span className="material-symbols-outlined text-3xl text-panel-primary">
        {icon}
      </span>
      <div>
        <p className="font-bold text-panel-text">{title}</p>
        <p className="text-sm text-panel-muted">{time}</p>
      </div>
    </div>
  );
}
