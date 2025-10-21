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
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-50 transition-opacity group-hover:opacity-100">
            <span className="material-symbols-outlined text-8xl text-black">
              play_circle
            </span>
          </div>
        )}
        
        {/* Completion overlay */}
        {isCompleted && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90">
            <span className="material-symbols-outlined text-9xl text-panel-primary">
              check_circle 
            </span>
             Completado
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
