import Image from "next/image";

import { PrimaryButton } from "../common/PrimaryButton";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBrDVrtz51gKZnzu54AbF6sly7uJSwsMyzGuPUqgbh8sD6TtChC3ndjUC2p20cSiavAzteEm3ctCwc8AxfkfhEAwed1Im1tyv9_xZ6J2iYGsxuYzWxcOwwGUdPuAUDryv9jZZw5xu63cbNAzU9LXIA4GmwDgfpi-VXucnPLnWzL2oGyy9mIZ6lg4T-qZ1M4F7BAxT6WCT71FzbOsegxnGjq1b2LzD7sPlz1lk33fk3_ByZjrC3-IRqn1kr-9d-JDTHM1jNL85VbyA";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-primary/40 px-6 py-24 text-center text-white shadow-xl md:px-16">
      <div className="absolute inset-0 -z-10">
        <Image
          src={HERO_IMAGE}
          alt="Lush greenery representing holistic well-being"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-primary/60" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-black leading-tight md:text-5xl">
            Unlock Your Potential: The Kiconu Method
          </h1>
          <p className="text-lg leading-relaxed text-white/85">
            A unique fusion of nutrition and transpersonal coaching to help you achieve holistic
            well-being.
          </p>
        </div>
        <PrimaryButton href="#contact" className="bg-white text-primary hover:bg-primary-400">
          Book a Free Consultation
        </PrimaryButton>
      </div>
    </section>
  );
}
