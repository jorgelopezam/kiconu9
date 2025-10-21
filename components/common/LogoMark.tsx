type LogoMarkProps = {
  className?: string;
  textClassName?: string;
  showWordmark?: boolean;
};

export function LogoMark({
  className,
  textClassName,
  showWordmark = true,
}: LogoMarkProps) {
  return (
    <span
      className={`inline-flex items-center gap-3 text-primary ${className ?? ""}`.trim()}
    >
      <svg
        aria-hidden
        className="size-8"
        fill="currentColor"
        viewBox="0 0 48 48"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M4 4h13.333v13.333H30.666V30.666H44V44H4Z" />
      </svg>
      {showWordmark && (
        <span
          className={`text-xl font-bold tracking-tight text-foreground ${textClassName ?? ""}`.trim()}
        >
          Kiconu
        </span>
      )}
    </span>
  );
}
