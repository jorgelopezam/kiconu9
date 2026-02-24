"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import { AboutSection } from "../components/sections/AboutSection";
import { BenefitsSection } from "../components/sections/BenefitsSection";
import { ContactSection } from "../components/sections/ContactSection";
import { HeroSection } from "../components/sections/HeroSection";
import { HowItWorksSection } from "../components/sections/HowItWorksSection";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (loading || !user) return;

      setCheckingProfile(true);
      try {
        const profile = await getUserProfile(user.uid);

        if (!profile) {
          // User authenticated but no profile - redirect to payment first
          router.push("/payment");
        } else if (profile.user_type === null) {
          // Profile exists but no plan selected - redirect to payment
          router.push("/payment");
        } else if (!profile.age || !profile.height || !profile.weight || !profile.gender) {
          // Plan selected but missing registration details
          router.push("/register");
        } else {
          // Redirect based on user role and type
          // Coach users get their dedicated panel
          if (profile.isCoach) {
            router.push("/panelcoach");
          } else if (profile.user_type === "base") {
            router.push("/cursos");
          } else {
            // kiconu and premium users go to panel
            router.push("/panel");
          }
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [user, loading, router]);

  // Show loading state while checking auth or profile
  if (loading || checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // If user is authenticated, don't render landing page (redirect is happening)
  if (user) {
    return null;
  }

  // Show landing page for logged out users
  return (
    <div className="relative min-h-screen">
      {/* Fixed Background Image */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/branding/landingBackground2.webp"
          alt="Fondo Kiconu"
          fill
          className="object-cover opacity-30 dark:opacity-20"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-16 py-12 md:space-y-24">
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <BenefitsSection />
        <ContactSection />
      </div>
    </div>
  );
}
