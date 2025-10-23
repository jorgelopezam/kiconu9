const highlights = [
  {
    icon: "spa",
    title: "Fusión Holística",
    description:
      "Combinamos nutrición personalizada y coaching transpersonal para abordar tu ser en todas sus dimensiones: física, mental y emocional.",
  },
  {
    icon: "sentiment_very_satisfied",
    title: "Filosofía Kintsugi",
    description:
      "Celebramos tus cicatrices. Tu historia no es algo a ocultar, sino la hoja de ruta hacia tu resiliencia y libertad.",
  },
  {
    icon: "self_improvement",
    title: "Conexión Cuerpo-Mente",
    description:
      "A través de técnicas somáticas y respiratorias aprenderás a escuchar la sabiduría de tu cuerpo y cultivar paz interior.",
  },
  {
    icon: "calendar_month",
    title: "Cambio Sostenible",
    description:
      "Siete meses para integrar nuevos hábitos de forma sólida y garantizar que tu transformación sea para siempre.",
  },
];

export function AboutSection() {
  return (
    <section id="programa" className="rounded-[2.5rem] bg-surface px-6 py-24 shadow-xl md:px-16 md:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          Transformación Nutritiva
        </span>
        <h2 className="mt-4 font-display text-4xl font-bold text-foreground md:text-5xl">
          ¿Qué es la Transformación Nutritiva?
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
          Una inmersión profunda en tu bienestar, una <strong>inversión de 7 meses</strong> para recalibrar tu vida. Con 14 sesiones fusionamos ciencia y alma, guiándote para honrar tu historia y construir un futuro vibrante. Kiconu no es una dieta, es un renacer.
        </p>
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-2">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="flex flex-col items-center gap-4 rounded-2xl border border-border px-8 py-10 text-center transition hover:border-primary/40 hover:shadow-lg"
          >
            <span className="material-symbols-outlined flex size-14 items-center justify-center rounded-full bg-primary/15 text-3xl text-primary">
              {item.icon}
            </span>
            <h3 className="font-display text-2xl font-semibold text-primary">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
