"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionScheduled: () => void;
}

export function ScheduleSessionModal({
  isOpen,
  onClose,
  onSessionScheduled,
}: ScheduleSessionModalProps) {
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedCoach, setSelectedCoach] = useState<"Nutricion" | "Transpersonal">("Nutricion");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Generate next 7 days including today
  const getNext7Days = () => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Generate time slots from 8:00 AM to 8:00 PM
  const getTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 20) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const formatDayName = (date: Date) => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[date.getDay()];
  };

  const formatDate = (date: Date) => {
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const handleSave = async () => {
    if (!selectedDay || !selectedTime || !user) {
      setError("Por favor selecciona día y hora");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      // Create a timestamp for the session day + time
      const sessionDateTime = new Date(selectedDay);
      const [hours, minutes] = selectedTime.split(':');
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      await addDoc(collection(db, "sessions"), {
        user_id: user.uid,
        day: Timestamp.fromDate(sessionDateTime),
        time: selectedTime,
        duration: 90,
        status: "scheduled",
        coach: selectedCoach,
        stage: "Fase 1", // Default stage
        title: `Sesión ${selectedCoach}`,
        created_at: Timestamp.now(),
      });

      onSessionScheduled();
      onClose();
      
      // Reset form
      setSelectedDay(null);
      setSelectedTime("");
      setSelectedCoach("Nutricion");
    } catch (err) {
      console.error("Error scheduling session:", err);
      setError("Error al programar la sesión. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const next7Days = getNext7Days();
  const timeSlots = getTimeSlots();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-panel-card border border-panel-border shadow-xl">
        <div className="sticky top-0 bg-panel-card border-b border-panel-border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-panel-text">Programar Sesión</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-panel-muted hover:bg-panel-border transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-500">
              {error}
            </div>
          )}

          {/* Coach Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Tipo de Sesión
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedCoach("Nutricion")}
                className={`rounded-lg border-2 p-4 text-center transition-all ${
                  selectedCoach === "Nutricion"
                    ? "border-green-400 bg-green-400/10 text-green-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-2 text-3xl">
                  restaurant
                </span>
                <div className="font-semibold">Nutrición</div>
              </button>
              <button
                onClick={() => setSelectedCoach("Transpersonal")}
                className={`rounded-lg border-2 p-4 text-center transition-all ${
                  selectedCoach === "Transpersonal"
                    ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-2 text-3xl">
                  self_improvement
                </span>
                <div className="font-semibold">Transpersonal</div>
              </button>
            </div>
          </div>

          {/* Day Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Selecciona el día
            </label>
            <div className="grid grid-cols-7 gap-2">
              {next7Days.map((day, index) => {
                const isSelected = selectedDay?.getTime() === day.getTime();
                const isToday = index === 0;
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-lg border-2 p-3 text-center transition-all ${
                      isSelected
                        ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                        : "border-panel-border bg-panel-bg text-panel-text hover:border-panel-primary"
                    }`}
                  >
                    <div className="text-xs font-medium">{formatDayName(day)}</div>
                    <div className="mt-1 text-lg font-bold">{day.getDate()}</div>
                    {isToday && (
                      <div className="mt-1 text-xs text-panel-primary">Hoy</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Selecciona la hora
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto rounded-lg border border-panel-border p-3">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time;
                
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-lg border p-2 text-center text-sm font-medium transition-all ${
                      isSelected
                        ? "border-panel-primary bg-panel-primary text-white"
                        : "border-panel-border bg-panel-bg text-panel-text hover:border-panel-primary"
                    }`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Duration (Read-only) */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Duración
            </label>
            <div className="rounded-lg border border-panel-border bg-panel-bg p-4 text-panel-muted">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">schedule</span>
                <span>90 minutos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-panel-border bg-panel-card p-6">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-lg border border-panel-border bg-panel-bg px-6 py-3 font-semibold text-panel-text transition-colors hover:bg-panel-border disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedDay || !selectedTime || isSaving}
              className="flex-1 rounded-lg bg-panel-primary px-6 py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Programar Sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
