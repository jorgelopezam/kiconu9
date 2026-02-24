"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import type { User } from "@/lib/firestore-schema";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
import { AdminScheduleSessionModal } from "@/components/panel/AdminScheduleSessionModal";
import { EditSessionModal } from "@/components/panel/EditSessionModal";

type SessionData = {
  id: string;
  user_id: string;
  day: Timestamp;
  time: string;
  duration: number;
  status: string;
  coach: string;
  coach_user_id?: string;
  scheduled_by_coach?: string;
  stage: string;
  title: string;
};

type UserData = {
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
};

export default function CalendarioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState<User | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [userCache, setUserCache] = useState<Map<string, UserData>>(() => new Map());
  const userCacheRef = useRef(userCache);
  const [coachColors, setCoachColors] = useState<Map<string, string>>(new Map());
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    userCacheRef.current = userCache;
  }, [userCache]);

  // Fetch all sessions from Firestore
  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const sessionsRef = collection(db, "sessions");
      const q = query(sessionsRef);
      const snapshot = await getDocs(q);

      const sessionsData: SessionData[] = [];
      const userIds = new Set<string>();

      snapshot.forEach((docItem) => {
        const session = { id: docItem.id, ...docItem.data() } as SessionData;
        sessionsData.push(session);
        userIds.add(session.user_id);
      });

      setSessions(sessionsData);

      // Fetch coach colors
      const coachIds = new Set<string>();
      sessionsData.forEach(s => {
        if (s.coach_user_id) coachIds.add(s.coach_user_id);
        else if (s.scheduled_by_coach) coachIds.add(s.scheduled_by_coach);
      });

      if (coachIds.size > 0) {
        const promises = Array.from(coachIds).map(id => getUserProfile(id));
        const results = await Promise.allSettled(promises);

        setCoachColors(prev => {
          const next = new Map(prev);
          results.forEach((res, index) => {
            const id = Array.from(coachIds)[index];
            if (res.status === "fulfilled" && res.value?.color) {
              next.set(id, res.value.color);
            }
          });
          return next;
        });
      }

      // Fetch user details for all unique user_ids
      const cacheCopy = new Map(userCacheRef.current);
      let cacheUpdated = false;
      for (const userId of userIds) {
        if (!cacheCopy.has(userId)) {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              cacheCopy.set(userId, {
                first_name: userData.first_name || "",
                last_name: userData.last_name || "",
                email: userData.email || "",
                user_type: userData.user_type || "",
              });
              cacheUpdated = true;
            }
          } catch (userError) {
            console.error(`Error fetching user ${userId}:`, userError);
          }
        }
      }

      if (cacheUpdated) {
        userCacheRef.current = cacheCopy;
        setUserCache(cacheCopy);
      }
    } catch (error: unknown) {
      // Handle collection doesn't exist yet
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "failed-precondition"
      ) {
        console.log("Firestore index is being created or collection is empty.");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message?: unknown }).message === "string" &&
        ((error as { message?: string }).message?.includes("index") ?? false)
      ) {
        console.log("Firestore index is being created or collection is empty.");
      } else {
        console.error("Error fetching sessions:", error);
      }
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const handleSessionClick = async (session: SessionData) => {
    const userData = userCache.get(session.user_id);
    if (userData) {
      setSelectedSession(session);
      setSelectedUserDetails(userData);
      setIsEditModalOpen(true);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (loading) return;

      if (!user) {
        router.push("/");
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);

        if (!profile) {
          router.push("/");
          return;
        }

        if (!profile.is_admin) {
          router.push("/panel");
          return;
        }

        setCurrentProfile(profile);
        // Fetch sessions once admin access is confirmed
        fetchSessions();
      } catch (error) {
        console.error("Error checking admin access:", error);
        router.push("/");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAdminAccess();
  }, [user, loading, router, fetchSessions]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getSessionsForDay = (day: number) => {
    return sessions.filter((session) => {
      const sessionDate = session.day.toDate();
      return (
        sessionDate.getDate() === day &&
        sessionDate.getMonth() === currentDate.getMonth() &&
        sessionDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  if (loading || checkingAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
          <p className="text-sm text-panel-muted">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile || !currentProfile.is_admin) {
    return null;
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const dayNames = ["D", "L", "M", "X", "J", "V", "S"];

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        <main className="flex-1">
          {loadingSessions && (
            <div className="mb-4 rounded-xl border border-panel-border bg-panel-card p-4 text-sm text-panel-muted">
              Cargando sesiones programadas...
            </div>
          )}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-black tracking-tight text-panel-text">Actividades</h1>
              <button
                onClick={() => setIsAddSessionModalOpen(true)}
                className="flex h-10 items-center justify-center gap-2 overflow-hidden rounded-xl bg-panel-primary px-4 text-sm font-bold leading-normal tracking-wide text-white transition hover:opacity-90"
              >
                <span className="material-symbols-outlined text-xl">add</span>
                <span className="truncate">Añadir Sesión</span>
              </button>
              <Link
                href="/admindisponibilidad"
                className="flex h-10 items-center justify-center gap-2 overflow-hidden rounded-xl border border-panel-border bg-panel-card px-4 text-sm font-bold leading-normal tracking-wide text-panel-text transition hover:bg-panel-bg"
              >
                <span className="material-symbols-outlined text-xl">calendar_month</span>
                <span className="truncate">Disponibilidad</span>
              </Link>
            </div>

            <div className="flex px-4 py-3">
              <div className="flex h-10 flex-1 items-center justify-center rounded-xl bg-panel-bg p-1">
                <label className="flex h-full grow cursor-pointer items-center justify-center overflow-hidden rounded-lg px-4 text-sm font-medium leading-normal text-panel-muted transition has-[:checked]:bg-panel-card has-[:checked]:text-panel-primary has-[:checked]:shadow-sm">
                  <span className="truncate">Día</span>
                  <input
                    className="invisible w-0"
                    name="view-switcher"
                    type="radio"
                    value="day"
                    checked={viewMode === "day"}
                    onChange={() => setViewMode("day")}
                  />
                </label>
                <label className="flex h-full grow cursor-pointer items-center justify-center overflow-hidden rounded-lg px-4 text-sm font-medium leading-normal text-panel-muted transition has-[:checked]:bg-panel-card has-[:checked]:text-panel-primary has-[:checked]:shadow-sm">
                  <span className="truncate">Semana</span>
                  <input
                    className="invisible w-0"
                    name="view-switcher"
                    type="radio"
                    value="week"
                    checked={viewMode === "week"}
                    onChange={() => setViewMode("week")}
                  />
                </label>
                <label className="flex h-full grow cursor-pointer items-center justify-center overflow-hidden rounded-lg px-4 text-sm font-medium leading-normal text-panel-muted transition has-[:checked]:bg-panel-card has-[:checked]:text-panel-primary has-[:checked]:shadow-sm">
                  <span className="truncate">Mes</span>
                  <input
                    className="invisible w-0"
                    name="view-switcher"
                    type="radio"
                    value="month"
                    checked={viewMode === "month"}
                    onChange={() => setViewMode("month")}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-panel-card p-4 shadow-lg sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={goToPreviousMonth}>
                <span className="material-symbols-outlined flex size-10 items-center justify-center text-panel-muted transition hover:text-panel-text">
                  chevron_left
                </span>
              </button>
              <h2 className="text-center text-xl font-bold leading-tight text-panel-text">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={goToNextMonth}>
                <span className="material-symbols-outlined flex size-10 items-center justify-center text-panel-muted transition hover:text-panel-text">
                  chevron_right
                </span>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((day) => (
                <p
                  key={day}
                  className="flex h-12 w-full items-center justify-center pb-0.5 text-sm font-bold leading-normal tracking-wide text-panel-muted"
                >
                  {day}
                </p>
              ))}

              {Array.from({ length: startingDayOfWeek }).map((_, index) => (
                <div key={`empty-${index}`} className="h-28"></div>
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const daySessions = getSessionsForDay(day);
                const isTodayDay = isToday(day);

                return (
                  <div
                    key={day}
                    className={`flex min-h-28 flex-col rounded-lg border p-1 text-xs ${isTodayDay
                      ? "border-panel-primary bg-panel-primary/10"
                      : "border-panel-border"
                      }`}
                  >
                    <span
                      className={`text-xs ${isTodayDay ? "font-bold text-panel-primary" : "font-medium text-panel-text"
                        }`}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5 overflow-y-auto text-xs ">
                      {daySessions.map((session) => {
                        const userData = userCache.get(session.user_id);
                        const userName = userData
                          ? `${userData.first_name} ${userData.last_name}`
                          : "Usuario";

                        let bgColor = "";
                        let textColor = "text-black";

                        if (session.status === "cancelled") {
                          bgColor = "bg-red-500";
                          textColor = "text-white";

                        } else if (session.status === "finished") {
                          bgColor = "bg-blue-500";
                          textColor = "text-white";
                        } else {
                          // Try coach color from ID
                          const coachId = session.coach_user_id || session.scheduled_by_coach;
                          let colorClass = coachId ? coachColors.get(coachId) : null;

                          // Try coach color from current profile (if matching name)
                          if (!colorClass && currentProfile && session.coach === currentProfile.first_name) {
                            colorClass = currentProfile.color;
                          }

                          if (colorClass) {
                            bgColor = colorClass;
                            textColor = "text-white";
                          } else if (session.coach === "Nutricion") {
                            bgColor = "bg-green-400";
                          } else if (session.coach === "Transpersonal") {
                            bgColor = "bg-yellow-400";
                          } else {
                            bgColor = "bg-blue-400";
                          }
                        }

                        return (
                          <button
                            key={session.id}
                            onClick={() => handleSessionClick(session)}
                            className={`w-full rounded px-1 py-0.5 text-left transition-opacity hover:opacity-75 flex items-center gap-1 ${bgColor} ${textColor}`}
                            title={`${userName} - ${session.time}\nClick para editar`}
                          >
                            <div className="text-[.6rem] font-bold">{session.time}</div>
                            <div className="text-[.55rem] truncate">{userName}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Admin Add Session Modal */}
      <AdminScheduleSessionModal
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        onSessionScheduled={fetchSessions}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedSession(null);
          setSelectedUserDetails(null);
        }}
        onSessionUpdated={fetchSessions}
        session={selectedSession}
        userDetails={selectedUserDetails}
      />
    </div>
  );
}
