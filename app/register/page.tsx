"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserRegistrationDetails } from "@/lib/firestore-helpers";

export default function RegisterPage() {
  const { user, userProfile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    age: "",
    height: "",
    weight: "",
    gender: "" as "male" | "female" | "other" | "prefer_not_to_say" | "",
  });

  useEffect(() => {
    if (userProfile && !loading) {
      setFormData({
        first_name: userProfile.first_name || "",
        last_name: userProfile.last_name || "",
        age: userProfile.age?.toString() || "",
        height: userProfile.height?.toString() || "",
        weight: userProfile.weight?.toString() || "",
        gender: (userProfile.gender as any) || "",
      });
    }
  }, [userProfile, loading]);

  useEffect(() => {
    // If not logged in, redirect to home
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    // Validate form
    if (!formData.first_name || !formData.last_name || !formData.age || !formData.height || !formData.weight || !formData.gender) {
      alert("Por favor, completa todos los campos");
      return;
    }

    try {
      setSubmitting(true);

      // Update user profile with registration details
      await updateUserRegistrationDetails(user.uid, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        age: parseInt(formData.age),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        gender: formData.gender as "male" | "female" | "other" | "prefer_not_to_say",
      });

      // Refresh profile in context so AuthGuard sees the new data
      await refreshProfile();

      // Redirect to cursos (user already has a plan selected)
      router.push("/cursos");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Error al guardar tu información. Por favor intenta de nuevo.");
      setSubmitting(false);
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
      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6">
        <div className="rounded-xl border border-panel-border bg-panel-card p-8 shadow-lg">
          <h1 className="mb-2 text-3xl font-bold text-panel-text">
            Completa Tu Perfil
          </h1>
          <p className="mb-8 text-panel-muted">
            Ayúdanos a personalizar tu experiencia en Kiconu compartiendo algunos detalles.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* First Name */}
              <div>
                <label htmlFor="first_name" className="mb-2 block text-sm font-medium text-panel-text">
                  Nombre
                </label>
                <input
                  type="text"
                  id="first_name"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  placeholder="Tu nombre"
                />
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="last_name" className="mb-2 block text-sm font-medium text-panel-text">
                  Apellido
                </label>
                <input
                  type="text"
                  id="last_name"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  placeholder="Tu apellido"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {/* Age */}
              <div>
                <label htmlFor="age" className="mb-2 block text-sm font-medium text-panel-text">
                  Edad
                </label>
                <input
                  type="number"
                  id="age"
                  min="13"
                  max="120"
                  required
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  placeholder="Ingresa tu edad"
                />
              </div>

              {/* Height */}
              <div>
                <label htmlFor="height" className="mb-2 block text-sm font-medium text-panel-text">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  id="height"
                  min="50"
                  max="300"
                  step="0.1"
                  required
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  placeholder="Ingresa tu altura en centímetros"
                />
              </div>

              {/* Weight */}
              <div>
                <label htmlFor="weight" className="mb-2 block text-sm font-medium text-panel-text">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  id="weight"
                  min="20"
                  max="500"
                  step="0.1"
                  required
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  placeholder="Ingresa tu peso en kilogramos"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label htmlFor="gender" className="mb-2 block text-sm font-medium text-panel-text">
                Género (Este dato ayuda a los diagnósticos ya que algunos requerimientos de nutrición son diferentes para hombres y mujeres)
              </label>
              <select
                id="gender"
                required
                value={formData.gender}
                onChange={(e) => setFormData({
                  ...formData,
                  gender: e.target.value as "male" | "female" | "other" | "prefer_not_to_say"
                })}
                className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
              >
                <option value="">Selecciona tu género</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="other">Otro</option>
                <option value="prefer_not_to_say">Prefiero no decir</option>
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-panel-primary px-6 py-4 text-base font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Completar Registro"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
