export function ContactSection() {
  return (
    <section id="contacto" className="rounded-[2.5rem] bg-surface px-6 py-24 shadow-xl md:px-16 md:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          Contacto
        </span>
        <h2 className="mt-4 font-display text-4xl font-bold text-foreground md:text-5xl">
          ¿Preparad@ para comenzar?
        </h2>
        <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
          Tu viaje hacia un nuevo yo comienza con una simple conversación. Contáctanos para resolver tus dudas o reservar tu plaza. Estamos aquí para ti.
        </p>
      </div>

      <div className="mt-16 grid gap-8 md:grid-cols-2">
        <article className="rounded-3xl border border-border bg-background/70 p-8 text-left shadow-md">
          <h3 className="font-display text-2xl font-bold text-primary">Paula Nityasri Segarra</h3>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Coach Transpersonal
          </p>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            “Te guiaré a explorar tu mundo interior para liberar tu máximo potencial.”
          </p>
          <a
            href="mailto:paula@kiconu.com"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/70"
          >
            <span className="material-symbols-outlined text-lg">email</span>
            Contactar a Paula
          </a>
        </article>

        <article className="rounded-3xl border border-border bg-background/70 p-8 text-left shadow-md">
          <h3 className="font-display text-2xl font-bold text-primary">Irene M. Buitrago</h3>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Nutricionista
          </p>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            “Diseñaré el mapa nutricional que tu cuerpo necesita para regenerarse y brillar.”
          </p>
          <a
            href="mailto:irene@kiconu.com"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/70"
          >
            <span className="material-symbols-outlined text-lg">email</span>
            Contactar a Irene
          </a>
        </article>
      </div>
    </section>
  );
}
