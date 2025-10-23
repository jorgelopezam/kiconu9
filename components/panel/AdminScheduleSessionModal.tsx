"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, Timestamp, query } from "firebase/firestore";

interface AdminScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionScheduled: () => void;
}

interface User {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function AdminScheduleSessionModal({
  isOpen,
  onClose,
  onSessionScheduled,
}: AdminScheduleSessionModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedCoach, setSelectedCoach] = useState<"Nutricion" | "Transpersonal">("Nutricion");
  const [duration, setDuration] = useState<number>(90);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef);
        const snapshot = await getDocs(q);
        
        const usersData: User[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          usersData.push({
            user_id: doc.id,
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
          });
        });
        
        const nonAdminUsers = usersData.filter(u => !u.email.includes("admin"));
        setUsers(nonAdminUsers);
        setFilteredUsers(nonAdminUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => 
      user.first_name.toLowerCase().includes(query) ||
      user.last_name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const getSelectedUserName = () => {
    if (!selectedUserId) return "";
    const user = users.find(u => u.user_id === selectedUserId);
    return user ? `${user.first_name} ${user.last_name}` : "";
  };

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
    if (!selectedDay || !selectedTime || !selectedUserId) {
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

      await addDoc(collection(db, "sessions"), {
        user_id: selectedUserId,
        day: Timestamp.fromDate(sessionDateTime),
        time: selectedTime,
        duration: duration,
        status: "scheduled",
        coach: selectedCoach,
        stage: "Fase 1",
        title: `Sesión ${selectedCoach}`,
        created_at: Timestamp.now(),
      });

      onSessionScheduled();
      onClose();
      
      // Reset form
      setSelectedUserId("");
      setSelectedDay(null);
      setSelectedTime("");
      setSelectedCoach("Nutricion");
      setDuration(90);
    } catch (err) {
      console.error("Error scheduling session:", err);
      setError("Error al programar la sesión. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const next30Days = getNext30Days();
  const timeSlots = getTimeSlots();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto scrollbar-hide rounded-2xl bg-panel-card border border-panel-border shadow-xl">
        <div className="sticky top-0 bg-panel-card border-b border-panel-border p-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-panel-text">Añadir Sesión</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-panel-muted hover:bg-panel-border transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* User Selection */}
          <div>
            <label className="mb-1 block text-xs font-medium text-panel-text">
              Usuario
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar y seleccionar usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 pr-10 text-sm text-panel-text placeholder:text-panel-muted focus:border-panel-primary focus:outline-none"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-panel-muted">
                search
              </span>
            </div>
            
            {/* Show selected user or user list */}
            {selectedUserId && !searchQuery ? (
              <div className="mt-2 rounded-lg border border-panel-primary bg-panel-primary/10 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-panel-text">
                    <div className="font-medium">{getSelectedUserName()}</div>
                    <div className="text-xs text-panel-muted">Usuario seleccionado</div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUserId("");
                      setSearchQuery("");
                    }}
                    className="rounded p-1 text-panel-muted hover:bg-panel-border transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 max-h-40 overflow-y-auto scrollbar-hide rounded-lg border border-panel-border bg-panel-bg">
                {filteredUsers.length > 0 ? (
                  <div className="p-1">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.user_id);
                          setSearchQuery("");
                        }}
                        className={`w-full rounded px-2 py-1.5 text-left transition-colors ${
                          selectedUserId === user.user_id
                            ? "bg-panel-primary text-white"
                            : "text-panel-text hover:bg-panel-border"
                        }`}
                      >
                        <div className="text-sm font-medium">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-xs opacity-75">{user.email}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-panel-muted">
                    {searchQuery ? "No se encontraron usuarios" : "Escribe para buscar usuarios"}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coach Selection */}
          <div>
            <label className="mb-1 block text-xs font-medium text-panel-text">
              Tipo de Sesión
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedCoach("Nutricion")}
                className={`rounded-lg border-2 p-3 text-center transition-all ${
                  selectedCoach === "Nutricion"
                    ? "border-green-400 bg-green-400/10 text-green-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-1 text-2xl">
                  restaurant
                </span>
                <div className="text-sm font-semibold">Nutrición</div>
              </button>
              <button
                onClick={() => setSelectedCoach("Transpersonal")}
                className={`rounded-lg border-2 p-3 text-center transition-all ${
                  selectedCoach === "Transpersonal"
                    ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                    : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                }`}
              >
                <span className="material-symbols-outlined mb-1 text-2xl">
                  self_improvement
                </span>
                <div className="text-sm font-semibold">Transpersonal</div>
              </button>
            </div>
          </div>

          {/* Day Selection */}
          <div>
            <label className="mb-1 block text-xs font-medium text-panel-text">
              Selecciona el día
            </label>
            <div className="grid grid-cols-7 gap-1.5 p-2 rounded-lg border border-panel-border bg-panel-bg">
              {next30Days.map((day, index) => {
                const isSelected = selectedDay?.getTime() === day.getTime();
                const isToday = index === 0;
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`rounded-lg border-2 p-1.5 text-center transition-all ${
                      isSelected
                        ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                        : "border-panel-border bg-panel-card text-panel-text hover:border-panel-primary"
                    }`}
                  >
                    <div className="text-[10px] font-medium">{formatDayName(day)}</div>
                    <div className="mt-0.5 text-xs font-bold">{day.getDate()}</div>
                    <div className="text-[9px] text-panel-muted">{formatDate(day)}</div>
                    {isToday && (
                      <div className="mt-0.5 text-[9px] text-panel-primary">Hoy</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Selection */}
          <div>
            <label className="mb-1 block text-xs font-medium text-panel-text">
              Selecciona la hora
            </label>
            <div className="grid grid-cols-6 gap-1.5 rounded-lg border border-panel-border bg-panel-bg p-2">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time;
                
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-all ${
                      isSelected
                        ? "border-panel-primary bg-panel-primary text-white"
                        : "border-panel-border bg-panel-card text-panel-text hover:border-panel-primary"
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
            <label className="mb-1 block text-xs font-medium text-panel-text">
              Duración (minutos)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 90)}
              min="30"
              max="180"
              step="15"
              className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-panel-border bg-panel-card p-4">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-lg border border-panel-border bg-panel-bg px-4 py-2 text-sm font-semibold text-panel-text transition-colors hover:bg-panel-border disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedDay || !selectedTime || !selectedUserId || isSaving}
              className="flex-1 rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Añadir Sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
