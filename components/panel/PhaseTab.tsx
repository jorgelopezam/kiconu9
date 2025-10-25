import Image from "next/image";

interface PhaseTabProps {
  imageUrl: string;
  title: string;
  progress: number;
  isSelected: boolean;
  onClick: () => void;
}

export function PhaseTab({
  imageUrl,
  title,
  progress,
  isSelected,
  onClick,
}: PhaseTabProps) {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer flex-row gap-3 items-center rounded-2xl border-2 bg-panel-primary transition-all duration-300 ${
        isSelected
          ? "border-panel-primary shadow-lg"
          : "border-panel-border opacity-20 hover:opacity-75"
      }`}
    >
      <div className="hidden h-16 w-16 overflow-hidden rounded-xl border border-black/10 bg-black/10 lg:flex">
        <Image
          src={imageUrl}
          alt={title}
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex lg:grid lg:gap-2 justify-center p-2 gap-4 m-auto items-center">
        <p className="text-center text-xl font-bold leading-normal text-black">
          {title}
        </p>
        <div className="">
          <p className="text-center text-lg font-medium text-black">
            {progress}% completado
          </p>
          <div className="rounded-full bg-black border-2  border-black">
            <div
              className="h-2 rounded-full bg-panel-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
