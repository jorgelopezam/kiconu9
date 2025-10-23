const tiers = [
  {
    name: "Base",
    price: "€0",
    original: "€900",
    description: "El viaje esencial",
    highlighted: false,
    features: [
      { icon: "check", text: "Acceso a Webinars Gratuitos" },
      { icon: "check", text: "Puedes comprar cursos y talleres individuales" },
      { icon: "check", text: "1 Semana Incluida del Programa de Coaching Kiconu" },
    ],
    cta: "Elijo Base",
  },
  {
    name: "Kiconu",
    price: "€850",
    original: "€1100",
    description: "La experiencia completa",
    highlighted: true,
    features: [
      { icon: "check", text: "Todo lo del Plan Base" },
      { icon: "check", text: "Acceso completo al programa de coaching Kiconu de 9 meses" },
      { icon: "check", text: "Acceso a meditaciones, videos de acompañamiento y más" },
    ],
    cta: "Elijo Kiconu",
  },
  {
    name: "Premium",
    price: "€950",
    original: "€1300",
    description: "Acompañamiento VIP",
    highlighted: false,
    features: [
      { icon: "check", text: "Todo lo del plan Kiconu" },
      { icon: "check", text: "Kit de instrumentos para medir mejor tu progreso" },
      { icon: "check", text: "Acceso incluido a todos los cursos y talleres que no forman parte del programa de coaching" },
    ],
    cta: "Elijo Premium",
  },
];

export function BenefitsSection() {
  return (
    <section id="precios" className="rounded-[2.5rem] bg-surface px-6 py-24 shadow-xl md:px-16 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          Planes
        </span>
        <h2 className="mt-4 font-display text-4xl font-bold text-foreground md:text-5xl">
          Una inversión en tu felicidad
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
          Elige el camino que mejor resuena contigo.
        </p>
      </div>

      <div className="mt-16 grid gap-10 md:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.name}
            className={`relative flex flex-col rounded-3xl border px-8 py-10 transition-all ${
              tier.highlighted
                ? "border-primary bg-primary text-white shadow-2xl"
                : "border-border bg-background/70 shadow-md hover:border-primary/40"
            }`}
          >
            {/* {tier.highlighted && (
              <span className="absolute -top-6 border border-3 left-1/2 w-max -translate-x-1/2 rounded-full bg-background p-4 text-xs font-semibold uppercase tracking-[0.25em] text-foreground">
                Recomendado
              </span>
            )} */}
            <div className="flex flex-col gap-2 text-left">
              <h3 className={`font-display text-4xl font-bold ${tier.highlighted ? "text-white" : "text-foreground"}`}>
                {tier.name}
              </h3>
              <p className={`text-sm ${tier.highlighted ? "text-white/70" : "text-muted-foreground"}`}>
                {tier.description}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <p className={`text-4xl font-extrabold ${tier.highlighted ? "text-white" : "text-primary"}`}>{tier.price}</p>
              <p className={`text-sm line-through ${tier.highlighted ? "text-white/60" : "text-muted-foreground"}`}>
                {tier.original}
              </p>
            </div>
            <ul className={`mt-6 flex flex-col gap-3 text-sm ${tier.highlighted ? "text-white" : "text-foreground"}`}>
              {tier.features.map((feature) => (
                <li key={feature.text} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-lg">
                    {feature.icon}
                  </span>
                  <span>{feature.text}</span>
                </li>
              ))}
            </ul>
            <a
              href="#contacto"
              className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold tracking-wide transition ${
                tier.highlighted
                  ? "bg-white text-primary hover:bg-white/90"
                  : "bg-panel-muted text-black hover:bg-primary/25"
              }`}
            >
              {tier.cta}
            </a>
          </article>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>
          <strong>Aceptamos:</strong> Transferencia, Bizum, PayPal, Efectivo.
        </p>
        <p className="mt-2">¿Prefieres pagar a plazos? Hablemos.</p>
      </div>
    </section>
  );
}
