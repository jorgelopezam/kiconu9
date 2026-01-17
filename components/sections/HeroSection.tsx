import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative h-[85vh] w-full overflow-hidden rounded-[2.5rem] bg-surface shadow-2xl md:h-[90vh] items-center grid">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/branding/landingBackground1.webp"
          alt="Bienestar natural"
          fill
          className="object-cover opacity-60 dark:opacity-40"
          priority
        />
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/70 to-transparent dark:from-background/95" />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-end px-4 pb-20 text-center text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
          <h1 className="max-w-2xl font-display text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
            Repara, Nutre, Transforma.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Descubre Kiconu, un viaje de 9 meses que une <strong>nutrición avanzada y coaching transpersonal</strong>. Inspirado en la filosofía Kintsugi, te ayudamos a convertir tus imperfecciones en tus mayores fortalezas.
          </p>
          <a
            href="#programa"
            className="group flex h-14 items-center justify-center rounded-full bg-primary px-10 text-base font-semibold tracking-wide text-white shadow-lg transition-all hover:bg-primary-600 hover:shadow-xl hover:-translate-y-0.5"
          >
            <span>Descubre el Viaje</span>
            <span className="material-symbols-outlined ml-2 transition-transform group-hover:translate-x-1">arrow_forward</span>
          </a>
        </div>
      </div>
    </section>
  );
}
