"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import { AboutSection } from "../components/sections/AboutSection";
import { BenefitsSection } from "../components/sections/BenefitsSection";
import { ContactSection } from "../components/sections/ContactSection";
import { HeroSection } from "../components/sections/HeroSection";
import { HowItWorksSection } from "../components/sections/HowItWorksSection";
import { TestimonialsSection } from "../components/sections/TestimonialsSection";

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
          // All good, go to panel
          router.push("/panel");
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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user is authenticated, don't render landing page (redirect is happening)
  if (user) {
    return null;
  }

  // Show landing page for logged out users
  return (
    <div className="space-y-20 py-12">
      <HeroSection />
      <AboutSection />
      <HowItWorksSection />
      <BenefitsSection />
      <TestimonialsSection />
      <ContactSection />
    </div>
  );
}
