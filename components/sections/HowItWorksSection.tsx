const phases = [
  {
    month: "Mes 1-2",
    label: "Reset Integral",
    description:
      "Depuramos tu cuerpo con nutrición antiinflamatoria e identificamos los patrones mentales que te limitan.",
    items: [
      { icon: "local_florist", text: "Nutrición Detox" },
      { icon: "psychology", text: "Introducción a PNL" },
      { icon: "edit_note", text: "Diario de auto-observación" },
    ],
  },
  {
    month: "Mes 3-5",
    label: "Regenerativa",
    description:
      "Nutrimos tus células y reprogramamos tu mente con técnicas avanzadas de neuroplasticidad y conexión somática.",
    items: [
      { icon: "restaurant_menu", text: "Plan personalizado" },
      { icon: "sync_saved_locally", text: "Reprogramación mental" },
      { icon: "air", text: "Técnicas respiratorias" },
    ],
  },
  {
    month: "Mes 6-7",
    label: "Mi Nuevo Sentir",
    description:
      "Integramos y consolidamos. Aprenderás a comer de forma intuitiva y liderar tu vida desde tu propósito.",
    items: [
      { icon: "spa", text: "Alimentación consciente" },
      { icon: "flag", text: "Auto-liderazgo" },
      { icon: "menu_book", text: "Dossier de recetas Kiconu" },
    ],
  },
];

export function HowItWorksSection() {
  return (
    <section id="fases" className="rounded-[2.5rem] bg-surface/90 px-6 py-24 shadow-xl md:px-16 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          Estructura del Programa
        </span>
        <h2 className="mt-4 font-display text-4xl font-bold text-foreground md:text-5xl">
          Las fases de tu evolución
        </h2>
      </div>

      <div className="relative mt-16 grid gap-10 md:grid-cols-3">
        <div className="pointer-events-none absolute left-4 right-4 top-1/2 hidden -translate-y-1/2 bg-border/50 md:block" aria-hidden />
        {phases.map((phase, index) => (
          <article key={phase.label} className="relative flex flex-col rounded-3xl border border-border bg-background/30 px-8 py-10 text-left shadow-sm transition hover:shadow-lg">
            <div className="mb-4 grid place-items-center size-14  rounded-full bg-primary text-3xl font-semibold uppercase text-white ">
              {index + 1}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              {phase.month}
            </p>
            <h3 className="mt-3 font-display text-2xl font-bold text-primary">{phase.label}</h3>
            <p className="mt-4 flex-grow text-sm leading-relaxed text-muted-foreground">{phase.description}</p>
            <ul className="mt-6 space-y-3 text-sm text-foreground">
              {phase.items.map((item) => (
                <li key={item.text} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg text-primary" aria-hidden>
                    {item.icon}
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
