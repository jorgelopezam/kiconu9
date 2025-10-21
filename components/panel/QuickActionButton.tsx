interface QuickActionButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
}

export function QuickActionButton({ icon, label, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-xl border border-panel-border bg-panel-card p-4 transition-colors hover:bg-panel-primary/10"
    >
      <span className="material-symbols-outlined text-panel-primary">{icon}</span>
      <span className="font-medium text-panel-text">{label}</span>
    </button>
  );
}
