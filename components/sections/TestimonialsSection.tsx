import Image from "next/image";

import { SectionHeading } from "../common/SectionHeading";

const testimonials = [
  {
    quote:
      "The Kiconu program was life-changing. I not only feel healthier and more energetic, but I also have a newfound clarity and purpose in my life.",
    name: "Sarah L.",
    role: "Marketing Manager",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuApVP34KhuOpjevemSW1eBc7bVTDFHI-0j75fFly-hGWlqa1yeSN_3KlKPPnbcnlSQogWi0L8f4SIt3mSjPYOM0G0pvRDVc5SibXgGAkbaqhklAwiFaHpMWVv0NZmLUitKNsNWSMvPMQe78yhnhcV3cfpCXuqDtylm5S7ttI0wbH9izdkwsk4CllryTZqDlDFQisgB3ekZ7eSOa2zBVS-PW3MoUgGft8IZvPX9aEEM7NDc0C2bT7gLna_3ZZ_4Lq2xz4NO8Vgaq-g",
  },
  {
    quote:
      "I was skeptical at first, but the combination of nutrition and coaching is incredibly powerful. I've broken through so many old patterns.",
    name: "Mark T.",
    role: "Entrepreneur",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDCiN78cWnJWXx3obbXk9fn6ggaOGHemXSEG9XUJu4f_YuC6_PV56UsYt_eLfeuEPLEL1Xmlb3Z5trOxoe-amC9pL33TVVwAP0KxL8Rz-Td60Xzq47u2dcaflbZw2u5XQP-jcK7QdvSC_Q9_4nZVPidpEz9-0ld7XIlERMgULqHWKIRirtzY4SkCk1_1F2CmgSMOS0k-BjVxOjaZQyaEuqKO7AOh3gpwHtl-J1uW2i0qzlDv_tJxj6OH8RxY4OVY7gkqyVO3DEbbg",
  },
];

export function TestimonialsSection() {
  return (
    <section className="rounded-3xl bg-desert-sand/35 px-6 py-20" id="testimonials">
      <SectionHeading
        title="What Our Clients Say"
        description="Real stories from people who embraced the Kiconu method and transformed their relationship with health and purpose."
      />
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {testimonials.map((testimonial) => (
          <figure
            key={testimonial.name}
            className="flex flex-col gap-5 rounded-2xl border border-sage/30 bg-background/80 p-8 shadow-sm"
          >
            <blockquote className="text-base italic leading-relaxed text-muted-foreground">
              “{testimonial.quote}”
            </blockquote>
            <figcaption className="flex items-center gap-4">
              <Image
                src={testimonial.image}
                alt={`Portrait of ${testimonial.name}`}
                width={56}
                height={56}
                className="size-14 rounded-full object-cover"
              />
              <div>
                <p className="text-base font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-sm text-grullo">{testimonial.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
