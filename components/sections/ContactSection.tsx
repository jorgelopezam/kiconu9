import { SectionHeading } from "../common/SectionHeading";

export function ContactSection() {
  return (
    <section className="py-20" id="contact">
      <div className="mx-auto max-w-xl rounded-3xl border border-sage/30 bg-surface p-10 shadow-lg">
        <SectionHeading
          align="left"
          title="Get Started Today"
          description="Enter your details to receive our free guide to mindful eating and schedule your consultation."
        />
        <form className="mt-10 flex flex-col gap-4">
          <label className="text-sm font-medium text-foreground" htmlFor="name">
            Your Name
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Doe"
              className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </label>
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Your Email
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-xl border border-sage/40 bg-desert-sand/30 px-4 py-3 text-base text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </label>
          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
          >
            Get My Free Guide
          </button>
        </form>
      </div>
    </section>
  );
}
