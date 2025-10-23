"use client";

interface NextActivityCardProps {
  icon: string;
  title: string;
  time?: string;
  hasSession?: boolean;
  onSchedule?: () => void;
}

export function NextActivityCard({ 
  icon, 
  title, 
  time,
  hasSession = true,
  onSchedule 
}: NextActivityCardProps) {
  if (!hasSession && onSchedule) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-panel-border bg-panel-card p-4">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-3xl text-panel-primary">
            {icon}
          </span>
          <div>
            <p className="font-bold text-panel-text">{title}</p>
            <p className="text-sm text-panel-muted">Ninguna programada</p>
          </div>
        </div>
        <button
          onClick={onSchedule}
          className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Programar Sesión
        </button>
      </div>
    );
  }

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
