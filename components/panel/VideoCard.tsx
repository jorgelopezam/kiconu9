interface VideoCardProps {
  title: string;
  description: string;
  duration: string;
  imageUrl: string;
  isCompleted: boolean;
  onClick?: () => void;
}

export function VideoCard({
  title,
  description,
  duration,
  imageUrl,
  isCompleted,
  onClick,
}: VideoCardProps) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer flex-col gap-3 overflow-hidden rounded-lg bg-panel-card pb-3 shadow-sm transition-shadow duration-300 hover:shadow-lg"
    >
      <div className="relative aspect-video w-full">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${imageUrl}")` }}
        />
        
        {/* Play icon on hover (for non-completed videos) */}
        {!isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-7xl text-white drop-shadow-lg">
              play_circle
            </span>
          </div>
        )}
        
        {/* Completion overlay */}
        {isCompleted && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85">
            <span className="material-symbols-outlined text-8xl text-panel-primary drop-shadow-[0_0_20px_rgba(204,194,156,0.6)]">
              check_circle 
            </span>
            <span className="mt-3 text-sm font-semibold text-white drop-shadow-md">Completado</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 p-4">
        <p className="text-base font-medium leading-normal text-panel-text">
          {title}
        </p>
        <p className="text-sm font-normal leading-normal text-panel-muted">
          {description}
        </p>
        <div className="mt-2 inline-block w-fit rounded-full bg-panel-border px-2.5 py-0.5 text-xs font-semibold text-panel-muted">
          {duration}
        </div>
      </div>
    </div>
  );
}
