"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getUsersByCoach, getAllUsers, getCoachesForUser, getCoachAvailability } from "@/lib/firestore-helpers";
import type { User, SessionAvailability } from "@/lib/firestore-schema";

interface CoachScheduleSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSessionScheduled: () => void;
    coachUserId: string;
    isAdmin?: boolean;
    isCoach?: boolean;
}

interface AssignedUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
}

export function CoachScheduleSessionModal({
    isOpen,
    onClose,
    onSessionScheduled,
    coachUserId,
    isAdmin = false,
    isCoach = true,
}: CoachScheduleSessionModalProps) {
    const [users, setUsers] = useState<AssignedUser[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AssignedUser[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>("");

    // New state for dynamic coach selection
    const [assignedCoaches, setAssignedCoaches] = useState<User[]>([]);
    const [coachAvailability, setCoachAvailability] = useState<SessionAvailability[]>([]);
    const [selectedCoach, setSelectedCoach] = useState<User | null>(null);

    const [duration, setDuration] = useState<number>(90);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>("");
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Fetch users: all users for admin (not coach), assigned users for coach
    useEffect(() => {
        const fetchUsers = async () => {
            if (!coachUserId) return;

            setLoadingUsers(true);
            try {
                let fetchedUsers;

                // Admin (not coach) sees all non-admin, non-coach users
                if (isAdmin && !isCoach) {
                    const allUsers = await getAllUsers();
                    fetchedUsers = allUsers.filter(u => !u.is_admin && !u.isCoach);
                } else {
                    // Coach sees only their assigned users
                    fetchedUsers = await getUsersByCoach(coachUserId);
                }

                const usersData: AssignedUser[] = fetchedUsers.map(u => ({
                    id: (u as unknown as { id?: string }).id || u.user_id,
                    first_name: u.first_name || "",
                    last_name: u.last_name || "",
                    email: u.email || "",
                }));

                setUsers(usersData);
                setFilteredUsers(usersData);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoadingUsers(false);
            }
        };

        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen, coachUserId, isAdmin, isCoach]);

    // Fetch assigned coaches when a user is selected
    useEffect(() => {
        const fetchCoaches = async () => {
            if (!selectedUserId) {
                setAssignedCoaches([]);
                setSelectedCoach(null);
                return;
            }

            try {
                const coaches = await getCoachesForUser(selectedUserId);
                setAssignedCoaches(coaches);

                // If the current logged-in user is one of the assigned coaches, select them by default
                const me = coaches.find(c => c.user_id === coachUserId);
                if (me) {
                    setSelectedCoach(me);
                } else if (coaches.length > 0) {
                    // Otherwise select the first available coach
                    setSelectedCoach(coaches[0]);
                } else {
                    setSelectedCoach(null);
                }
            } catch (error) {
                console.error("Error fetching coach details:", error);
            }
        };

        fetchCoaches();
    }, [selectedUserId, coachUserId]);

    // Fetch availability when a coach is selected
    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedCoach) {
                setCoachAvailability([]);
                return;
            }
            try {
                const availability = await getCoachAvailability(selectedCoach.user_id);
                setCoachAvailability(availability);
                // Reset time selection when coach changes as availability might differ
                setSelectedTime("");
                // Optionally reset day if it becomes unavailable, but let's keep it and show empty slots
            } catch (error) {
                console.error("Error fetching availability:", error);
            }
        };
        fetchAvailability();
    }, [selectedCoach]);

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
        const user = users.find(u => u.id === selectedUserId);
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

    // Check if a date has any available slots
    const isDateAvailable = (date: Date) => {
        if (!selectedCoach || coachAvailability.length === 0) return true; // If no rules, assume available (or unavailable? let's assume available for now or prompt to add rules)
        // Actually, if no rules exist, usually means NO availability in a strict system. 
        // But for backward compatibility or ease of use, maybe default to available?
        // Let's assume strict: if rules exist, check them. If no rules, maybe user hasn't set them up.
        // For now, let's allow if no rules are set, OR check rules.
        if (coachAvailability.length === 0) return true;

        const slots = getAvailableSlotsForDate(date);
        return slots.length > 0;
    };

    // Calculate available time slots for a specific date based on rules
    const getAvailableSlotsForDate = (date: Date) => {
        if (!selectedCoach) return [];
        if (coachAvailability.length === 0) return getTimeSlots(); // Fallback to all slots if no rules

        // Logic adapted from admindisponibilidad
        // 1. Find relevant rules
        const relevantRules = coachAvailability.filter(r => {
            const ruleStart = new Date(r.start_date);
            ruleStart.setHours(0, 0, 0, 0);
            const ruleEnd = new Date(r.end_date);
            ruleEnd.setHours(23, 59, 59, 999);
            const checkDate = new Date(date);
            checkDate.setHours(12, 0, 0, 0);

            if (checkDate < ruleStart || checkDate > ruleEnd) return false;

            if (r.type === "periodicity" && r.days_of_week) {
                if (!r.days_of_week.includes(date.getDay())) return false;
            }
            return true;
        });

        const availableRules = relevantRules.filter(r => r.status === "available");
        const unavailableRules = relevantRules.filter(r => r.status === "unavailable");

        if (availableRules.length === 0) return [];

        const toMinutes = (time: string) => {
            const [h, m] = time.split(":").map(Number);
            return h * 60 + m;
        };

        let timeRanges: { start: number, end: number }[] = [];

        // Union available
        availableRules.forEach(r => {
            timeRanges.push({ start: toMinutes(r.start_time), end: toMinutes(r.end_time) });
        });

        // Subtract unavailable
        unavailableRules.forEach(u => {
            const uStart = toMinutes(u.start_time);
            const uEnd = toMinutes(u.end_time);

            const newRanges: { start: number, end: number }[] = [];
            timeRanges.forEach(range => {
                if (range.end <= uStart || range.start >= uEnd) {
                    newRanges.push(range);
                } else {
                    if (range.start < uStart) newRanges.push({ start: range.start, end: uStart });
                    if (range.end > uEnd) newRanges.push({ start: uEnd, end: range.end });
                }
            });
            timeRanges = newRanges;
        });

        // Convert generated time ranges back to specific slots (08:00, 08:30...)
        const allPossibleSlots = getTimeSlots();
        const validSlots = allPossibleSlots.filter(slotTime => {
            const slotStart = toMinutes(slotTime);
            // Assume 90 min duration for availability check? Or just start time?
            // Usually availability defines when you can START?
            // Let's check if the slot START is within any available range
            // And maybe check if it fits the duration?
            const slotEnd = slotStart + duration; // use current selected duration

            return timeRanges.some(range => slotStart >= range.start && slotEnd <= range.end);
        });

        return validSlots;
    };

    const handleSave = async () => {
        if (!selectedDay || !selectedTime || !selectedUserId || !selectedCoach) {
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
                coach: selectedCoach.first_name, // Save the coach's name (allowed by new rules)
                coach_user_id: selectedCoach.user_id, // Save the coach's user ID for color/profile lookup
                stage: "Fase 1",
                title: `Sesión ${selectedCoach.first_name}`,
                created_at: Timestamp.now(),
                scheduled_by_coach: coachUserId,
            });

            onSessionScheduled();
            onClose();

            // Reset form
            setSelectedUserId("");
            setSelectedDay(null);
            setSelectedTime("");
            // Don't reset selectedCoach here, keep it for next session
            setDuration(90);
            setSearchQuery("");
        } catch (err) {
            console.error("Error scheduling session:", err);
            setError("Error al programar la sesión. Por favor intenta de nuevo.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setSelectedUserId("");
        setSelectedDay(null);
        setSelectedTime("");
        // Don't reset selectedCoach
        setDuration(90);
        setSearchQuery("");
        setError("");
        onClose();
    };

    if (!isOpen) return null;

    const next30Days = getNext30Days();
    // Dynamically calculate time slots based on selected day
    const availableTimeSlots = selectedDay ? getAvailableSlotsForDate(selectedDay) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto scrollbar-hide rounded-2xl bg-panel-card border border-panel-border shadow-xl">
                <div className="sticky top-0 bg-panel-card border-b border-panel-border p-4 z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-panel-text">Añadir Sesión</h2>
                        <button
                            onClick={handleClose}
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
                            Cliente Asignado
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
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
                                        <div className="text-xs text-panel-muted">Cliente seleccionado</div>
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
                                {loadingUsers ? (
                                    <div className="p-3 text-center text-xs text-panel-muted">
                                        Cargando clientes...
                                    </div>
                                ) : filteredUsers.length > 0 ? (
                                    <div className="p-1">
                                        {filteredUsers.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedUserId(user.id);
                                                    setSearchQuery("");
                                                }}
                                                className={`w-full rounded px-2 py-1.5 text-left transition-colors ${selectedUserId === user.id
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
                                        {users.length === 0
                                            ? "No tienes clientes asignados"
                                            : searchQuery
                                                ? "No se encontraron clientes"
                                                : "Escribe para buscar clientes"
                                        }
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Coach Selection */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-panel-text">
                            Elegir Coach
                        </label>
                        {assignedCoaches.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {assignedCoaches.map(coach => {
                                    const isSelected = selectedCoach?.user_id === coach.user_id;
                                    // Use coach color if available, otherwise default to primary
                                    const borderColor = coach.color ? coach.color.replace('bg-', 'border-') : 'border-panel-primary';
                                    const bgColor = coach.color ? coach.color.replace('bg-', 'bg-') + '/10' : 'bg-panel-primary/10';
                                    const textColor = coach.color ? coach.color.replace('bg-', 'text-') : 'text-panel-primary';
                                    const iconColor = coach.color || "bg-panel-primary";

                                    return (
                                        <button
                                            key={coach.user_id}
                                            onClick={() => setSelectedCoach(coach)}
                                            className={`rounded-lg border-2 p-3 text-center transition-all ${isSelected
                                                ? `${borderColor} ${bgColor} ${textColor}`
                                                : "border-panel-border bg-panel-bg text-panel-muted hover:border-panel-primary"
                                                }`}
                                        >
                                            <div className="flex justify-center mb-1">
                                                <div className={`size-8 rounded-full ${isSelected ? iconColor : "bg-panel-primary/20"} flex items-center justify-center ${isSelected ? "text-white" : "text-panel-primary"} font-bold text-xs`}>
                                                    {coach.first_name?.charAt(0) || "C"}
                                                </div>
                                            </div>
                                            <div className="text-sm font-semibold truncate">
                                                {coach.first_name} {coach.last_name}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-sm text-panel-muted italic border border-dashed border-panel-border p-3 rounded-lg text-center">
                                {selectedUserId ? "El cliente no tiene coaches asignados." : "Selecciona un cliente para ver sus coaches."}
                            </div>
                        )}
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
                                const available = isDateAvailable(day);

                                return (
                                    <button
                                        key={day.toISOString()}
                                        onClick={() => available && setSelectedDay(day)}
                                        disabled={!available}
                                        className={`rounded-lg border-2 p-1.5 text-center transition-all ${isSelected
                                            ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                                            : available
                                                ? "border-panel-border bg-panel-card text-panel-text hover:border-panel-primary"
                                                : "border-panel-border bg-panel-bg/50 text-panel-muted opacity-50 cursor-not-allowed"
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
                            {availableTimeSlots.length > 0 ? (
                                availableTimeSlots.map((time) => {
                                    const isSelected = selectedTime === time;

                                    return (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-all ${isSelected
                                                ? "border-panel-primary bg-panel-primary text-white"
                                                : "border-panel-border bg-panel-card text-panel-text hover:border-panel-primary"
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-6 text-center text-xs text-panel-muted p-2">
                                    {selectedDay
                                        ? "No hay horarios disponibles para este día."
                                        : "Selecciona un día para ver horarios."}
                                </div>
                            )}
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
                            onClick={handleClose}
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
