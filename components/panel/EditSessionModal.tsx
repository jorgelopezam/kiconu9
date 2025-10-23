"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, Timestamp } from "firebase/firestore";

interface EditSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionUpdated: () => void;
  session: {
    id: string;
    user_id: string;
    day: Timestamp;
    time: string;
    duration: number;
    status: string;
    coach: string;
    stage: string;
    title: string;
  } | null;
  userDetails: {
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  } | null;
}

export function EditSessionModal({
  isOpen,
  onClose,
  onSessionUpdated,
  session,
  userDetails,
}: EditSessionModalProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [duration, setDuration] = useState<number>(90);
  const [status, setStatus] = useState<string>("scheduled");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (session && isOpen) {
      setSelectedDay(session.day.toDate());
      setSelectedTime(session.time);
      setDuration(session.duration);
      setStatus(session.status);
    }
  }, [session, isOpen]);

  // Generate next 30 days including today
  const getNext30Days = () => {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
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
    if (!selectedDay || !selectedTime || !session) {
      setError("Por favor completa todos los campos");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      // Create a timestamp for the session day + time
      const sessionDateTime = new Date(selectedDay);
      const [hours, minutes] = selectedTime.split(':');
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const sessionRef = doc(db, "sessions", session.id);
      await updateDoc(sessionRef, {
        day: Timestamp.fromDate(sessionDateTime),
        time: selectedTime,
        duration: duration,
        status: status,
        updated_at: Timestamp.now(),
      });

      onSessionUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating session:", err);
      setError("Error al actualizar la sesión. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !session || !userDetails) return null;

  const next30Days = getNext30Days();
  const timeSlots = getTimeSlots();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-panel-card border border-panel-border shadow-xl">
        <div className="sticky top-0 bg-panel-card border-b border-panel-border p-6 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-panel-text">Editar Sesión</h2>
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

          {/* User Details (Read-only) */}
          <div className="rounded-lg border border-panel-border bg-panel-bg p-4">
            <h3 className="mb-3 text-sm font-semibold text-panel-text">Información del Usuario</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-panel-muted">Nombre:</span>
                <span className="font-medium text-panel-text">
                  {userDetails.first_name} {userDetails.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-panel-muted">Email:</span>
                <span className="font-medium text-panel-text">{userDetails.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-panel-muted">Tipo:</span>
                <span className="font-medium text-panel-text">
                  {userDetails.user_type || 'No asignado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-panel-muted">Sesión:</span>
                <span className="font-medium text-panel-text">{session.coach}</span>
              </div>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Estado
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setStatus("scheduled")}
                className={`rounded-lg border-2 p-3 text-center transition-all ${
                  status === "scheduled"
                    ? "border-green-400 bg-green-400/10 text-green-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-1 text-2xl">
                  event_available
                </span>
                <div className="text-xs font-semibold">Programada</div>
              </button>
              <button
                onClick={() => setStatus("finished")}
                className={`rounded-lg border-2 p-3 text-center transition-all ${
                  status === "finished"
                    ? "border-blue-400 bg-blue-400/10 text-blue-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-1 text-2xl">
                  check_circle
                </span>
                <div className="text-xs font-semibold">Finalizada</div>
              </button>
              <button
                onClick={() => setStatus("cancelled")}
                className={`rounded-lg border-2 p-3 text-center transition-all ${
                  status === "cancelled"
                    ? "border-red-400 bg-red-400/10 text-red-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-1 text-2xl">
                  cancel
                </span>
                <div className="text-xs font-semibold">Cancelada</div>
              </button>
            </div>
          </div>

          {/* Day Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Selecciona el día
            </label>
            <div className="grid grid-cols-7 gap-2 max-h-64 overflow-y-auto p-2 rounded-lg border border-panel-border">
              {next30Days.map((day, index) => {
                const isSelected = selectedDay?.toDateString() === day.toDateString();
                const isToday = index === 0;
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-lg border-2 p-2 text-center transition-all ${
                      isSelected
                        ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                        : "border-panel-border bg-panel-bg text-panel-text hover:border-panel-primary"
                    }`}
                  >
                    <div className="text-xs font-medium">{formatDayName(day)}</div>
                    <div className="mt-1 text-sm font-bold">{day.getDate()}</div>
                    <div className="text-xs text-panel-muted">{formatDate(day)}</div>
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
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto rounded-lg border border-panel-border p-3">
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

          {/* Duration */}
          <div>
            <label className="mb-2 block text-sm font-medium text-panel-text">
              Duración (minutos)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
              min="30"
              max="180"
              step="15"
              className="w-full rounded-lg border border-panel-border bg-panel-bg p-3 text-panel-text focus:border-panel-primary focus:outline-none"
            />
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
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
