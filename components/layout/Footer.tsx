import { LogoMark } from "../common/LogoMark";

export function Footer() {
  return (
    <footer className="border-t border-sage/30 bg-surface py-10 relative z-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between md:px-10">
        <LogoMark className="text-primary" textClassName="text-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Kiconu. Todos los derechos reservados.</p>
          <p className="text-[12px] text-muted-foreground m-auto">version 6.8.11</p>
        </div>
      </div>
    </footer>
  );
}
