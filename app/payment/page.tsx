"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserType } from "@/lib/firestore-helpers";
import type { UserType } from "@/lib/firestore-schema";

interface PlanCardProps {
  name: string;
  price: number;
  userType: "base" | "kiconu" | "premium";
  features: string[];
  isPopular?: boolean;
  onSelect: (userType: "base" | "kiconu" | "premium") => void;
  isProcessing: boolean;
}

function PlanCard({ name, price, userType, features, isPopular, onSelect, isProcessing }: PlanCardProps) {
  return (
    <div className={`flex flex-col gap-6 rounded-xl p-6 ${
      isPopular 
        ? "relative border-2 border-panel-primary bg-panel-primary/5"
        : "border border-panel-border bg-panel-card"
    }`}>
      {isPopular && (
        <p className="absolute -translate-x-1/2 -translate-y-1/2 left-1/2 top-0 rounded-full bg-panel-primary px-4 py-1 text-center text-sm font-medium tracking-[0.015em] text-panel-text-light">
          Más Popular
        </p>
      )}
      
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-panel-text">{name}</h2>
        <p className="flex items-baseline gap-1 text-panel-text">
          <span className="text-5xl font-black tracking-[-0.033em]">${price}</span>
          <span className="text-base font-bold">/ mes (USD)</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="material-symbols-outlined text-panel-primary">check_circle</span>
            <p className="text-sm text-panel-text">{feature}</p>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button
          onClick={() => onSelect(userType)}
          disabled={isProcessing}
          className="flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-panel-primary px-5 text-base font-bold leading-normal tracking-[0.015em] text-panel-text transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate">
            {isProcessing ? "Procesando..." : "Seleccionar Plan"}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // If not logged in, redirect to home
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handlePlanSelect = async (selectedUserType: "base" | "kiconu" | "premium") => {
    if (!user || processing) return;

    try {
      setProcessing(true);

      // Redirect to payment2 page with selected plan
      router.push(`/payment2?plan=${selectedUserType}`);
    } catch (error) {
      console.error("Error selecting plan:", error);
      alert("Error al seleccionar el plan. Por favor intenta de nuevo.");
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-black tracking-[-0.033em] text-panel-text">
              Planes Kiconu
            </h1>
            <p className="mt-2 text-lg text-panel-muted">
              Elige el plan ideal para ti.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
            {/* Base Plan */}
            <PlanCard
              name="Base"
              price={500}
              userType="base"
              features={[
                "Acceso a talleres básicos y webinars gratuitos",
                "Puedes comprar talleres individuales cuando quieras",
                "Prueba gratuita 1 sesión del programa Kiconu",
               
              ]}
              onSelect={handlePlanSelect}
              isProcessing={processing}
            />

            {/* Kiconu Plan */}
            <PlanCard
              name="Kiconu"
              price={700}
              userType="kiconu"
              features={[
                "Programa Kiconu de 9 meses",
                "Sesiones personales con tu coach de nutrición",
                "Sesiones personales con tu coach transpersonal",
                "Herramientas para seguimiento diario de tu progreso",
                "Material adicional a las sesiones para agilizar tu progreso"
              ]}
              isPopular
              onSelect={handlePlanSelect}
              isProcessing={processing}
            />

            {/* Premium Plan */}
            <PlanCard
              name="Premium"
              price={900}
              userType="premium"
              features={[
                "Todo lo incluido en plan Kiconu",
                "Más sesiones personales de coaching",
                "Acceso a todos los cursos y talleres que no son parte del programa Kiconu"
              ]}
              onSelect={handlePlanSelect}
              isProcessing={processing}
            />
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-panel-muted">
            <span className="material-symbols-outlined">lock</span>
            <span>El procesamiento de pagos será integrado pronto. Haz clic para seleccionar tu plan.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
