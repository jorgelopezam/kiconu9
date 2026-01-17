import Image from "next/image";

const highlights = [
  {
    image: "/landing/fusionHolistica.webp",
    title: "Fusión Holística",
    description:
      "Combinamos nutrición personalizada y coaching transpersonal para abordar tu ser en todas sus dimensiones: física, mental y emocional.",
  },
  {
    image: "/landing/filosofiaKintsugi.webp",
    title: "Filosofía Kintsugi",
    description:
      "Celebramos tus cicatrices. Tu historia no es algo a ocultar, sino la hoja de ruta hacia tu resiliencia y libertad.",
  },
  {
    image: "/landing/conexionCuerpoMente.webp",
    title: "Conexión Cuerpo-Mente",
    description:
      "A través de técnicas somáticas y respiratorias aprenderás a escuchar la sabiduría de tu cuerpo y cultivar paz interior.",
  },
  {
    image: "/landing/cambioSostenible.webp",
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
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-background/50 shadow-md transition-all hover:border-primary/40 hover:shadow-xl hover:-translate-y-1"
          >
            {/* Image */}
            <div className="relative h-48 w-full overflow-hidden bg-sage/5">
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 px-8 py-6 text-center">
              <h3 className="font-display text-2xl font-semibold text-primary">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
