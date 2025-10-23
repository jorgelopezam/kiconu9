"use client";
import { useTheme } from "@/contexts/ThemeContext";

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
  const { theme } = useTheme();
  const logoSrc = theme === "dark" ? "/logoDark.png" : "/logoLight.png";

  return (
    <span>
      <img
        src={logoSrc}
        alt="Kiconu Logo"
        width={132}
        height={32}
      />
    </span>
  );
}
