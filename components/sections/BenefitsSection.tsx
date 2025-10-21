import { SectionHeading } from "../common/SectionHeading";

const benefits = [
  {
    icon: "local_florist",
    title: "Increased Energy & Vitality",
    description:
      "Fuel your body correctly and experience a new level of physical energy and vibrancy.",
  },
  {
    icon: "spa",
    title: "Mind-Body Harmony",
    description: "Learn to listen to your body's wisdom and cultivate a peaceful, balanced mind.",
  },
  {
    icon: "self_improvement",
    title: "Personal Growth",
    description:
      "Connect with your inner self, clarify your purpose, and unlock your true potential.",
  },
];

export function BenefitsSection() {
  return (
    <section className="space-y-12 py-20" id="benefits">
      <SectionHeading
        title="Program Benefits"
        description="Discover the holistic results our clients love—sustainable energy, emotional clarity, and deep personal transformation."
      />
      <div className="grid gap-8 md:grid-cols-3">
        {benefits.map((benefit) => (
          <article
            key={benefit.title}
            className="flex flex-col items-center gap-4 rounded-2xl border border-sage/30 bg-surface p-8 text-center shadow-sm transition-shadow hover:shadow-lg"
          >
            <span className="material-symbols-outlined text-4xl text-primary" aria-hidden>
              {benefit.icon}
            </span>
            <h3 className="text-xl font-semibold text-foreground">{benefit.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
