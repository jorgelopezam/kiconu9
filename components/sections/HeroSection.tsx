const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBrDVrtz51gKZnzu54AbF6sly7uJSwsMyzGuPUqgbh8sD6TtChC3ndjUC2p20cSiavAzteEm3ctCwc8AxfkfhEAwed1Im1tyv9_xZ6J2iYGsxuYzWxcOwwGUdPuAUDryv9jZZw5xu63cbNAzU9LXIA4GmwDgfpi-VXucnPLnWzL2oGyy9mIZ6lg4T-qZ1M4F7BAxT6WCT71FzbOsegxnGjq1b2LzD7sPlz1lk33fk3_ByZjrC3-IRqn1kr-9d-JDTHM1jNL85VbyA";

export function HeroSection() {
  return (
    <section className="relative h-[75vh] w-full overflow-hidden rounded-[2.5rem] bg-surface shadow-2xl md:h-[80vh] items-center grid">
      <div
        className="absolute inset-0 z-0 opacity-30 dark:opacity-40"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/60 to-transparent dark:from-background/90 " />

      <div className="relative z-20 flex flex-col items-center justify-end px-4 pb-16 text-center text-foreground">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
          <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl">
            Repara, Nutre, Transforma.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Descubre Kiconu, un viaje de 9 meses que une <strong>nutrición avanzada y coaching transpersonal</strong>. Inspirado en la filosofía Kintsugi, te ayudamos a convertir tus imperfecciones en tus mayores fortalezas.
          </p>
          <a
            href="#programa"
            className="flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold tracking-wide text-white transition hover:bg-primary-600"
          >
            Descubre el Viaje
          </a>
        </div>
      </div>
    </section>
  );
}
