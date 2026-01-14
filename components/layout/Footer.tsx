import Link from "next/link";

import { LogoMark } from "../common/LogoMark";

const socials = [
  {
    name: "Facebook",
    href: "https://facebook.com",
    icon: (
      <svg
        className="size-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "https://instagram.com",
    icon: (
      <svg
        className="size-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zm1.5-4.87h.01"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: (
      <svg
        className="size-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <circle cx="4" cy="4" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export function Footer() {
  return (
    <footer className="border-t border-sage/30 bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-10">
        <LogoMark className="text-primary" textClassName="text-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Kiconu. Todos los derechos reservados.</p>

          <p className="text-[12px] text-muted-foreground m-auto">version 6.0.1</p>

        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          {socials.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              aria-label={item.name}
              className="rounded-full border border-transparent p-2 transition-colors hover:border-primary/30 hover:text-primary"
            >
              {item.icon}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
