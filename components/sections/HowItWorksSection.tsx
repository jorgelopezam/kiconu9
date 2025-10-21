import { SectionHeading } from "../common/SectionHeading";

const steps = [
  {
    icon: "phone_in_talk",
    title: "1. Discovery Call",
    description:
      "We start with a free, no-obligation call to understand your goals and see if we're a good fit.",
  },
  {
    icon: "edit_document",
    title: "2. Personalized Plan",
    description:
      "Based on our call, we'll create a tailored nutrition and coaching plan just for you.",
  },
  {
    icon: "trending_up",
    title: "3. Ongoing Support",
    description:
      "Through regular sessions, we'll track your progress, adapt your plan, and support your growth.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="rounded-3xl bg-desert-sand/40 px-6 py-20" id="how-it-works">
      <SectionHeading
        title="How It Works"
        description="Our three-step process blends compassionate coaching with practical, science-backed nutrition guidance."
      />
      <div className="mt-12 grid gap-10 md:grid-cols-3">
        {steps.map((step) => (
          <div key={step.title} className="flex flex-col items-center gap-5 text-center">
            <span className="material-symbols-outlined flex size-16 items-center justify-center rounded-full bg-primary text-3xl text-white">
              {step.icon}
            </span>
            <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
