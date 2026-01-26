"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NextActivityCard } from "@/components/panel/NextActivityCard";
import { QuickActionButton } from "@/components/panel/QuickActionButton";
import { ScheduleSessionModal } from "@/components/panel/ScheduleSessionModal";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";

interface Session {
    id: string;
    user_id: string;
    day: Timestamp;
    time: string;
    duration: number;
    status: string;
    coach: string;
    stage: string;
    title: string;
}

export default function PanelClientePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

    // Fetch all upcoming scheduled sessions
    const fetchUpcomingSessions = useCallback(async () => {
        if (!user) return;

        setLoadingSessions(true);
        try {
            const now = Timestamp.now();
            const sessionsRef = collection(db, "sessions");
            const q = query(
                sessionsRef,
                where("user_id", "==", user.uid),
                where("status", "==", "scheduled"),
                where("day", ">=", now),
                orderBy("day", "asc")
            );

            const snapshot = await getDocs(q);
            const sessions: Session[] = [];
            snapshot.forEach((docItem) => {
                sessions.push({ id: docItem.id, ...docItem.data() } as Session);
            });
            setUpcomingSessions(sessions);
        } catch (error: unknown) {
            console.error("Error fetching sessions:", error);
            setUpcomingSessions([]);
        } finally {
            setLoadingSessions(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchUpcomingSessions();
        }
    }, [fetchUpcomingSessions, user]);

    const handleSessionScheduled = () => {
        fetchUpcomingSessions();
    };

    const formatSessionTime = (session: Session) => {
        const date = session.day.toDate();
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const dayName = dayNames[date.getDay()];
        const day = date.getDate();
        const month = monthNames[date.getMonth()];

        return `${dayName} ${day} ${month}, ${session.time}`;
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-panel-text">Cargando...</div>
            </div>
        );
    }

    if (!user) {
        // If not logged in, null will render until auth context handles redirect or we redirect
        // (AuthGuard is not used here but typically used in layout or higher up, assuming this page is protected)
        // We'll let the user effect or parent handle critical redirects if needed, but for now just return null.
        // Ideally we should redirect to login if not authenticated.
        return null;
    }

    // Get user's first name from email or displayName
    const firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Cliente";

    return (
        <div className="min-h-screen">
            <div className="mx-auto flex max-w-[1024px] flex-col px-2 py-8 sm:px-10">
                <h1 className="mb-6 text-3xl font-black text-panel-text">Hola, {firstName}</h1>

                {/* Next Activities */}
                <div className="mb-8">
                    <h2 className="mb-4 text-2xl font-bold text-panel-text">Próximas Actividades</h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {loadingSessions ? (
                            <div className="rounded-xl border border-panel-border bg-panel-card p-4 text-center text-panel-muted">
                                Cargando sesiones programadas...
                            </div>
                        ) : upcomingSessions.length > 0 ? (
                            upcomingSessions.map((session) => (
                                <NextActivityCard
                                    key={session.id}
                                    icon="groups"
                                    title={`Sesión ${session.coach}`}
                                    time={formatSessionTime(session)}
                                    hasSession={true}
                                />
                            ))
                        ) : (
                            <NextActivityCard
                                icon="groups"
                                title="Sesión 1-on-1"
                                hasSession={false}
                                onSchedule={() => setIsScheduleModalOpen(true)}
                            />
                        )}
                        <NextActivityCard
                            icon="self_improvement"
                            title="Meditación"
                            time="Hoy, 8:00 PM"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <QuickActionButton
                            icon="edit_note"
                            label="Diario"
                            onClick={() => router.push("/journal")}
                        />
                        <QuickActionButton
                            icon="scale"
                            label="Registrar peso/altura"
                            onClick={() => {
                                // TODO: Open weight logging modal
                                console.log("Log weight");
                            }}
                        />
                        <QuickActionButton
                            icon="spa"
                            label="Meditación Diaria"
                            onClick={() => router.push("/meditar")}
                        />
                    </div>
                </div>
            </div>

            {/* Schedule Session Modal */}
            <ScheduleSessionModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSessionScheduled={handleSessionScheduled}
            />
        </div>
    );
}
