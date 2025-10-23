import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";

type PrimaryButtonProps = {
  children: ReactNode;
  href?: LinkProps["href"];
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
  icon?: ReactNode;
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400 disabled:cursor-not-allowed disabled:opacity-60";

export function PrimaryButton({
  children,
  href,
  onClick,
  type = "button",
  className,
  icon,
}: PrimaryButtonProps) {
  const classes = `${baseStyles} ${className ?? ""}`.trim();
  const content = (
    <>
      {icon && (
        <span className="text-lg" aria-hidden>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
