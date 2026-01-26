"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, Timestamp, orderBy } from "firebase/firestore";
import type { SessionAvailability, AvailabilityType, AvailabilityStatus } from "@/lib/firestore-schema";
import { COLLECTIONS } from "@/lib/firestore-schema";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const SHORT_DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function AdminDisponibilidadPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [rules, setRules] = useState<SessionAvailability[]>([]);
    const [loadingRules, setLoadingRules] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    // New Rule State
    const [newRuleType, setNewRuleType] = useState<"available_range" | "available_periodicity" | "unavailable_range" | "unavailable_periodicity">("available_periodicity");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("17:00");
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

    useEffect(() => {
        const init = async () => {
            if (loading) return;
            if (!user) {
                router.push("/");
                return;
            }

            const profile = await getUserProfile(user.uid);
            if (!profile?.is_admin) {
                router.push("/panel");
                return;
            }

            fetchRules();
        };
        init();
    }, [user, loading, router]);

    const fetchRules = async () => {
        if (!user) return;
        setLoadingRules(true);
        try {
            const q = query(
                collection(db, COLLECTIONS.SESSIONS_AVAILABILITY),
                where("user_id", "==", user.uid)
            );
            const snapshot = await getDocs(q);
            const fetchedRules = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                start_date: doc.data().start_date.toDate(),
                end_date: doc.data().end_date.toDate(),
                created_at: doc.data().created_at.toDate(),
            })) as SessionAvailability[];

            // Sort client-side
            fetchedRules.sort((a, b) => b.start_date.getTime() - a.start_date.getTime());

            setRules(fetchedRules);
        } catch (error) {
            console.error("Error fetching rules:", error);
        } finally {
            setLoadingRules(false);
        }
    };

    const handleAddRule = async () => {
        if (!user) return;

        try {
            let type: AvailabilityType = "range";
            let status: AvailabilityStatus = "available";

            if (newRuleType.includes("periodicity")) type = "periodicity";
            if (newRuleType.includes("unavailable")) status = "unavailable";

            const start = new Date(startDate);
            // For periodicity, End Date is when the rule stops applying.
            // For range, End Date is the end of the range.
            const end = new Date(endDate);

            // Basic validation
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                alert("Por favor selecciona fechas válidas");
                return;
            }

            const newRule: Omit<SessionAvailability, "id"> = {
                user_id: user.uid,
                type,
                status,
                start_date: start,
                end_date: end,
                start_time: startTime,
                end_time: endTime,
                days_of_week: type === "periodicity" ? selectedDays : undefined,
                created_at: new Date(),
            };

            await addDoc(collection(db, COLLECTIONS.SESSIONS_AVAILABILITY), newRule);
            setIsAddModalOpen(false);
            fetchRules();
        } catch (error) {
            console.error("Error adding rule:", error);
            alert("Error al guardar la regla");
        }
    };

    const handleDeleteRule = async (ruleId: string) => {
        if (!confirm("¿Estás seguro de eliminar esta regla?")) return;
        try {
            await deleteDoc(doc(db, COLLECTIONS.SESSIONS_AVAILABILITY, ruleId));
            fetchRules();
        } catch (error) {
            console.error("Error deleting rule:", error);
        }
    };

    const toggleDay = (dayIndex: number) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex));
        } else {
            setSelectedDays([...selectedDays, dayIndex]);
        }
    };

    // Calendar Calculation Logic
    const getAvailabilityForDay = (date: Date) => {
        // 1. Find all rules that cover this date
        const relevantRules = rules.filter(r => {
            // Check date range
            const ruleStart = new Date(r.start_date);
            ruleStart.setHours(0, 0, 0, 0);
            const ruleEnd = new Date(r.end_date);
            ruleEnd.setHours(23, 59, 59, 999);
            const checkDate = new Date(date);
            checkDate.setHours(12, 0, 0, 0); // mid-day to avoid boundary issues

            if (checkDate < ruleStart || checkDate > ruleEnd) return false;

            // Check periodicity
            if (r.type === "periodicity" && r.days_of_week) {
                if (!r.days_of_week.includes(date.getDay())) return false;
            }

            return true;
        });

        // 2. Separate into available and unavailable
        const availableRules = relevantRules.filter(r => r.status === "available");
        const unavailableRules = relevantRules.filter(r => r.status === "unavailable");

        if (availableRules.length === 0) return [];

        // 3. Construct time blocks
        // This is a simplified logic: we assume if multiple "available" rules exist, they union.
        // If "unavailable" rules exist, they subtract.

        // Convert 24h strings to minutes for easier calculation
        const toMinutes = (time: string) => {
            const [h, m] = time.split(":").map(Number);
            return h * 60 + m;
        };

        let timeSlots: { start: number, end: number }[] = [];

        // Union available slots
        availableRules.forEach(r => {
            timeSlots.push({ start: toMinutes(r.start_time), end: toMinutes(r.end_time) });
        });

        // Subtract unavailable slots
        unavailableRules.forEach(u => {
            const uStart = toMinutes(u.start_time);
            const uEnd = toMinutes(u.end_time);

            const newSlots: { start: number, end: number }[] = [];
            timeSlots.forEach(slot => {
                // No overlap
                if (slot.end <= uStart || slot.start >= uEnd) {
                    newSlots.push(slot);
                    return;
                }

                // Overlap: Split or Trim
                if (slot.start < uStart) {
                    newSlots.push({ start: slot.start, end: uStart });
                }
                if (slot.end > uEnd) {
                    newSlots.push({ start: uEnd, end: slot.end });
                }
            });
            timeSlots = newSlots;
        });

        return timeSlots.sort((a, b) => a.start - b.start);
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    };

    const calendarDays = getDaysInMonth(currentDate);

    return (
        <div className="min-h-screen bg-panel-bg p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-panel-text">Disponibilidad</h1>
                        <p className="text-panel-muted">Gestiona tus horarios de coaching</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-panel-primary px-4 py-2 text-white font-semibold shadow-lg hover:opacity-90"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Añadir Regla
                    </button>
                </header>

                {/* Rules List */}
                <section className="mb-12">
                    <h2 className="mb-4 text-xl font-semibold text-panel-text">Reglas Activas</h2>
                    {loadingRules ? (
                        <div className="text-panel-muted">Cargando reglas...</div>
                    ) : rules.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-panel-border p-8 text-center text-panel-muted">
                            No tienes reglas de disponibilidad definidas.
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {rules.map(rule => (
                                <div key={rule.id} className={`relative rounded-xl border p-4 shadow-sm ${rule.status === 'unavailable' ? 'border-red-500/20 bg-red-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
                                    <button
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="absolute top-2 right-2 text-panel-muted hover:text-red-500"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`inline-block size-2 rounded-full ${rule.status === 'unavailable' ? 'bg-red-500' : 'bg-green-500'}`} />
                                        <span className="font-semibold text-panel-text">
                                            {rule.status === 'available' ? 'Disponible' : 'No Disponible'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-panel-text mb-1">
                                        {rule.type === 'periodicity' ? (
                                            <div className="flex flex-wrap gap-1">
                                                {rule.days_of_week?.map(d => (
                                                    <span key={d} className="rounded bg-panel-bg px-1.5 py-0.5 text-xs border border-panel-border">
                                                        {SHORT_DAY_NAMES[d]}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span>Rango específico</span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-panel-text my-2">
                                        {rule.start_time} - {rule.end_time}
                                    </div>
                                    <div className="text-xs text-panel-muted">
                                        {rule.start_date.toLocaleDateString()} &rarr; {rule.end_date.toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Calendar Visualization */}
                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-panel-text">
                            Vista Previa: {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                                className="p-2 hover:bg-panel-card rounded-lg"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button
                                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                                className="p-2 hover:bg-panel-card rounded-lg"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-panel-border rounded-lg overflow-hidden border border-panel-border">
                        {SHORT_DAY_NAMES.map(day => (
                            <div key={day} className="bg-panel-card p-2 text-center text-sm font-semibold text-panel-muted">
                                {day}
                            </div>
                        ))}
                        {/* Empty cells for start of month */}
                        {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-panel-bg min-h-[100px]" />
                        ))}
                        {/* Days */}
                        {calendarDays.map(day => {
                            const slots = getAvailabilityForDay(day);
                            const hasAvailability = slots.length > 0;

                            return (
                                <div key={day.toISOString()} className="bg-panel-card min-h-[100px] p-2 flex flex-col gap-1">
                                    <span className="text-sm font-medium text-panel-text mb-1">{day.getDate()}</span>
                                    {hasAvailability ? (
                                        <div className="flex flex-col gap-1">
                                            {slots.map((slot, i) => (
                                                <div key={i} className="rounded bg-green-500/20 text-green-700 px-1 py-0.5 text-xs text-center border border-green-500/30">
                                                    {Math.floor(slot.start / 60)}:{(slot.start % 60).toString().padStart(2, '0')} -
                                                    {Math.floor(slot.end / 60)}:{(slot.end % 60).toString().padStart(2, '0')}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center">
                                            <span className="block size-1 rounded-full bg-panel-border" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>

            {/* Add Rule Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-panel-card p-6 shadow-xl">
                        <h3 className="mb-6 text-xl font-bold text-panel-text">Añadir Regla de Disponibilidad</h3>

                        <div className="mb-6 space-y-3">
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:bg-panel-bg cursor-pointer">
                                <input
                                    type="radio"
                                    name="ruleType"
                                    checked={newRuleType === "available_periodicity"}
                                    onChange={() => setNewRuleType("available_periodicity")}
                                    className="accent-panel-primary"
                                />
                                <div>
                                    <div className="font-semibold text-panel-text">Disponibilidad Periódica</div>
                                    <div className="text-xs text-panel-muted">Ej: Todos los Lunes de 9am a 5pm</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:bg-panel-bg cursor-pointer">
                                <input
                                    type="radio"
                                    name="ruleType"
                                    checked={newRuleType === "available_range"}
                                    onChange={() => setNewRuleType("available_range")}
                                    className="accent-panel-primary"
                                />
                                <div>
                                    <div className="font-semibold text-panel-text">Rango de Disponibilidad Especifico</div>
                                    <div className="text-xs text-panel-muted">Ej: Del 3 al 10 de Feb de 10am a 11am</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:bg-panel-bg cursor-pointer">
                                <input
                                    type="radio"
                                    name="ruleType"
                                    checked={newRuleType === "unavailable_periodicity"}
                                    onChange={() => setNewRuleType("unavailable_periodicity")}
                                    className="accent-red-500"
                                />
                                <div>
                                    <div className="font-semibold text-red-500">Indisponibilidad Periódica</div>
                                    <div className="text-xs text-panel-muted">Ej: Bloquear todos los Viernes</div>
                                </div>
                            </label>

                            <label className="flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:bg-panel-bg cursor-pointer">
                                <input
                                    type="radio"
                                    name="ruleType"
                                    checked={newRuleType === "unavailable_range"}
                                    onChange={() => setNewRuleType("unavailable_range")}
                                    className="accent-red-500"
                                />
                                <div>
                                    <div className="font-semibold text-red-500">Rango de Indisponibilidad</div>
                                    <div className="text-xs text-panel-muted">Ej: Vacaciones o Días Festivos</div>
                                </div>
                            </label>
                        </div>

                        <div className="grid gap-4 mb-6">
                            {newRuleType.includes("periodicity") && (
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-panel-text">Días de la semana</label>
                                    <div className="flex gap-2">
                                        {SHORT_DAY_NAMES.map((day, idx) => (
                                            <button
                                                key={day}
                                                onClick={() => toggleDay(idx)}
                                                className={`size-8 rounded-full text-xs font-semibold transition ${selectedDays.includes(idx)
                                                    ? "bg-panel-primary text-white"
                                                    : "bg-panel-bg text-panel-muted hover:bg-panel-border"
                                                    }`}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-panel-muted">Fecha Inicio</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-panel-text"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-panel-muted">Fecha Fin</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-panel-text"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-panel-muted">Hora Inicio</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-panel-text"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-panel-muted">Hora Fin</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-panel-text"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="rounded-lg px-4 py-2 text-sm font-semibold text-panel-muted hover:bg-panel-bg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddRule}
                                className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
                            >
                                Guardar Regla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
