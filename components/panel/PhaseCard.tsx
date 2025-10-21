interface PhaseCardProps {
  imageUrl: string;
  title: string;
  description: string;
  onClick?: () => void;
}

export function PhaseCard({ imageUrl, title, description, onClick }: PhaseCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex cursor-pointer flex-col gap-4 rounded-xl border border-panel-border bg-black p-4 transition-all duration-300 hover:-translate-y-1 hover:border-panel-primary/50 hover:shadow-lg"
    >
      <div
        className="aspect-video w-full rounded-lg bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${imageUrl}")` }}
      />
      <div className="text-center">
        <p className="text-lg font-bold leading-normal text-panel-text">{title}</p>
        <p className="mt-1 text-sm font-normal leading-normal text-panel-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
