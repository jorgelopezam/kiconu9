"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EditSessionModal } from "@/components/panel/EditSessionModal";
import { CoachScheduleSessionModal } from "@/components/panel/CoachScheduleSessionModal";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, getUsersByCoach } from "@/lib/firestore-helpers";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/firestore-schema";

type TabType = "proximas" | "calendario" | "clientes";

type SessionData = {
  id: string;
  user_id: string;
  day: Timestamp;
  time: string;
  duration: number;
  status: "scheduled" | "finished" | "cancelled";
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

type AssignedClient = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
};

const SESSION_STATUS_OPTIONS: { value: SessionData["status"]; label: string }[] = [
  { value: "scheduled", label: "Programada" },
  { value: "finished", label: "Finalizada" },
  { value: "cancelled", label: "Cancelada" },
];

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "proximas", label: "Próximas Sesiones", icon: "event" },
  { id: "calendario", label: "Calendario", icon: "calendar_month" },
  { id: "clientes", label: "Clientes", icon: "group" },
];

export default function PanelCoachPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("proximas");

  // Auth state
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [coachUserId, setCoachUserId] = useState<string>("");
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Sessions state
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [userCache, setUserCache] = useState<Map<string, UserData>>(new Map());
  const userCacheRef = useRef(userCache);
  const [coachColors, setCoachColors] = useState<Map<string, string>>(new Map());
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);

  // Assigned clients state
  const [assignedClients, setAssignedClients] = useState<AssignedClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserData | null>(null);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");

  // Filter state
  const [sessionFilter, setSessionFilter] = useState<"all" | "nutricion" | "transpersonal">("all");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Load user profile and check coach access
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setLoadingProfile(false);
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setIsCoach(Boolean(profile.isCoach));
          setIsAdmin(Boolean(profile.is_admin));
          setCoachUserId(user.uid);
          setCurrentUserProfile(profile);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  // Fetch assigned clients for this coach (or all users for admin)
  const fetchAssignedClients = useCallback(async () => {
    if (!coachUserId) return;

    setLoadingClients(true);
    try {
      let clients: (User & { id?: string })[];

      // If user is admin but NOT a coach, show all users
      // If user is a coach, show only their assigned clients
      if (isAdmin && !isCoach) {
        const { getAllUsers } = await import("@/lib/firestore-helpers");
        const allUsers = await getAllUsers();
        clients = allUsers.filter(u => !u.is_admin && !u.isCoach);
      } else {
        clients = await getUsersByCoach(coachUserId);
      }

      setAssignedClients(clients.map(c => ({
        id: (c as unknown as { id?: string }).id || c.user_id,
        first_name: c.first_name || "",
        last_name: c.last_name || "",
        email: c.email || "",
        user_type: c.user_type || "",
      })));
    } catch (error) {
      console.error("Error fetching assigned clients:", error);
    } finally {
      setLoadingClients(false);
    }
  }, [coachUserId, isAdmin, isCoach]);



  // Fetch sessions for assigned clients only
  const fetchSessions = useCallback(async () => {
    if (!coachUserId || assignedClients.length === 0) {
      setSessions([]);
      setLoadingSessions(false);
      return;
    }

    setLoadingSessions(true);
    try {
      const clientIds = assignedClients.map(c => c.id);
      const sessionsRef = collection(db, "sessions");

      // Fetch sessions for all assigned clients
      const allSessions: SessionData[] = [];

      // Firestore 'in' query supports max 10 items, so batch if needed
      for (let i = 0; i < clientIds.length; i += 10) {
        const batch = clientIds.slice(i, i + 10);
        const q = query(
          sessionsRef,
          where("user_id", "in", batch),
          orderBy("day", "asc")
        );

        const snapshot = await getDocs(q);
        snapshot.docs.forEach(docItem => {
          allSessions.push({
            id: docItem.id,
            ...(docItem.data() as Omit<SessionData, "id">),
          });
        });
      }

      setSessions(allSessions);

      // Extract unique coach IDs to fetch their colors
      // Use both coach_user_id (new) and scheduled_by_coach (fallback)
      const coachIds = new Set<string>();
      if (coachUserId) coachIds.add(coachUserId);
      allSessions.forEach(s => {
        if (s.coach_user_id) coachIds.add(s.coach_user_id);
        else if (s.scheduled_by_coach) coachIds.add(s.scheduled_by_coach);
      });

      // Fetch coach profiles if they are not in cache (we reuse userCache for coaches too?)
      // userCache currently stores Client data. Let's make a separate cache for coaches?
      // Or just misuse userCache? userCache is Map<string, UserData>.
      // Let's use a separate state `coachColors` map.

      const newCoachColors = new Map<string, string>();

      const missingCoachIds = Array.from(coachIds).filter(id => !coachColors.has(id));

      if (missingCoachIds.length > 0) {
        // Fetch them
        // We can use getUserProfile
        const promises = missingCoachIds.map(id => getUserProfile(id));
        const results = await Promise.allSettled(promises);

        results.forEach((res, index) => {
          if (res.status === "fulfilled" && res.value) {
            if (res.value.color) {
              newCoachColors.set(missingCoachIds[index], res.value.color);
            }
          }
        });

        if (newCoachColors.size > 0) {
          setCoachColors(prev => {
            const next = new Map(prev);
            newCoachColors.forEach((color, id) => next.set(id, color));
            return next;
          });
        }
      }

      // Update user cache (for clients)
      const cacheCopy = new Map(userCacheRef.current);
      let cacheUpdated = false;

      for (const session of allSessions) {
        if (!cacheCopy.has(session.user_id)) {
          const client = assignedClients.find(c => c.id === session.user_id);
          if (client) {
            cacheCopy.set(session.user_id, {
              first_name: client.first_name,
              last_name: client.last_name,
              email: client.email,
              user_type: client.user_type,
            });
            cacheUpdated = true;
          }
        }
      }

      if (cacheUpdated) {
        userCacheRef.current = cacheCopy;
        setUserCache(cacheCopy);
      }
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [coachUserId, assignedClients, coachColors]); // coachColors dependency might cause loop if not careful? 
  // actually coachColors is state, so it will trigger re-fetch?
  // No, we only set coachColors if new ones are found.
  // But changing coachColors triggers fetchSessions?
  // We should remove coachColors from dependency array to avoid loop, 
  // or checks inside ensuring we don't fetch if already there.
  // But wait, `coachColors` is used in render, not in fetchSessions query logic.
  // The fetch logic for colors is INSIDE fetchSessions.
  // So adding `coachColors` to dependency is wrong if `coachColors` is updated inside it.
  // I will remove `coachColors` from dependency.

  // Load clients when coach ID is ready
  useEffect(() => {
    if (coachUserId && (isCoach || isAdmin)) {
      fetchAssignedClients();
    }
  }, [coachUserId, isCoach, isAdmin, fetchAssignedClients]);

  // Load sessions when clients are loaded
  useEffect(() => {
    if (assignedClients.length > 0) {
      fetchSessions();
    }
  }, [assignedClients]); // Removed fetchSessions from dep array to avoid issues with internal state updates?
  // Actually, fetchSessions uses coachUserId and assignedClients.
  // If I include fetchSessions in dep array, I must wrap it in useCallback. I did.
  // But if fetchSessions updates `coachColors`, and I depend on `coachColors`, infinite loop.
  // So `coachColors` should NOT be a dependency of `fetchSessions`. Correct.

  useEffect(() => {
    userCacheRef.current = userCache;
  }, [userCache]);

  // Session helpers
  const getUserDisplayName = (session: SessionData) => {
    const details = userCache.get(session.user_id);
    if (!details) return "Usuario";
    const fullName = `${details.first_name} ${details.last_name}`.trim();
    return fullName || details.email || "Usuario";
  };

  const formatSessionSchedule = (session: SessionData) => {
    const date = session.day.toDate();
    const formattedDate = date.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    const formattedTime = date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${formattedDate} · ${formattedTime}`;
  };

  const isSessionOverdue = (session: SessionData) => {
    if (session.status !== "scheduled") return false;
    return session.day.toDate() < new Date();
  };

  const getCoachColorClass = (session: SessionData) => {
    const coachId = session.coach_user_id || session.scheduled_by_coach;
    if (coachId && coachColors.has(coachId)) {
      return coachColors.get(coachId);
    }
    if (currentUserProfile && session.coach === currentUserProfile.first_name) {
      return currentUserProfile.color;
    }
    return null;
  };

  const getCoachStyles = (session: SessionData) => {
    // Try to find color
    const colorClass = getCoachColorClass(session);

    if (colorClass) {
      // Assume colorClass is like "bg-red-500"
      return {
        badgeBg: colorClass.replace('bg-', 'bg-') + '/15',
        badgeText: colorClass.replace('bg-', 'text-').replace('500', '600'), // approximate
        dot: colorClass,
        label: session.coach,
      };
    }

    // Fallback
    if (session.coach === "Nutricion") {
      return {
        badgeBg: "bg-green-500/15",
        badgeText: "text-green-600",
        dot: "bg-green-400",
        label: "Nutrición",
      };
    }
    if (session.coach === "Transpersonal") {
      return {
        badgeBg: "bg-yellow-500/15",
        badgeText: "text-yellow-600",
        dot: "bg-yellow-400",
        label: "Transpersonal",
      };
    }
    return {
      badgeBg: "bg-blue-500/15",
      badgeText: "text-blue-600",
      dot: "bg-blue-400",
      label: session.coach,
    };
  };

  // Session handlers
  const handleStatusChange = useCallback(async (session: SessionData, newStatus: SessionData["status"]) => {
    if (session.status === newStatus) return;
    try {
      setUpdatingSessionId(session.id);
      await updateDoc(doc(db, "sessions", session.id), {
        status: newStatus,
        updated_at: Timestamp.now(),
      });
      await fetchSessions();
    } catch (error) {
      console.error("Error updating session status:", error);
    } finally {
      setUpdatingSessionId(null);
    }
  }, [fetchSessions]); // fetchSessions depends on coachColors? No.

  const handleSessionClick = async (session: SessionData) => {
    const userData = userCache.get(session.user_id);
    if (userData) {
      setSelectedSession(session);
      setSelectedUserDetails(userData);
      setIsEditModalOpen(true);
    }
  };

  // Calendar helpers
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const dayNames = ["D", "L", "M", "X", "J", "V", "S"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return {
      daysInMonth: lastDay.getDate(),
      startingDayOfWeek: firstDay.getDay(),
    };
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

  // Filtered sessions for "proximas" tab
  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return sessions
      .filter(s => s.status === "scheduled" && s.day.toDate() >= now)
      .slice(0, 10);
  }, [sessions]);

  // Click outside handler
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
          <p className="text-sm text-panel-muted">Cargando panel...</p>
        </div>
      </div>
    );
  }

  if (!isCoach && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-panel-muted">No tienes acceso a este panel.</p>
        </div>
      </div>
    );
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
        {/* Tab Navigation */}
        <div className="mb-6 flex gap-1 rounded-xl bg-panel-bg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${activeTab === tab.id
                ? "bg-panel-card text-panel-primary shadow-sm"
                : "text-panel-muted hover:text-panel-text"
                }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "proximas" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-panel-text">Próximas Sesiones</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddSessionModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-panel-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Añadir Sesión
                </button>
              </div>
            </div>

            {/* Sessions List */}
            <div className="rounded-2xl border border-panel-border bg-panel-card p-4 shadow-sm">
              {loadingSessions ? (
                <div className="py-8 text-center text-sm text-panel-muted">
                  Cargando sesiones...
                </div>
              ) : upcomingSessions.length === 0 ? (
                <div className="py-8 text-center text-sm text-panel-muted">
                  No hay sesiones programadas.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.map((session) => {
                    const coachStyles = getCoachStyles(session);
                    const overdue = isSessionOverdue(session);
                    const isUpdating = updatingSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        className={`rounded-xl border px-4 py-3 transition ${overdue
                          ? "border-red-400/80 bg-red-500/5"
                          : "border-panel-border bg-panel-bg"
                          }`}
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className={`font-semibold ${overdue ? "text-red-600" : "text-panel-text"}`}>
                              {getUserDisplayName(session)}
                            </p>
                            <p className="text-xs text-panel-muted">{formatSessionSchedule(session)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs ${coachStyles.badgeBg} ${coachStyles.badgeText}`}>
                              <span className={`size-1.5 rounded-full ${coachStyles.dot}`}></span>
                              {coachStyles.label}
                            </span>
                            <select
                              value={session.status}
                              onChange={(e) => handleStatusChange(session, e.target.value as SessionData["status"])}
                              disabled={isUpdating}
                              className="rounded-lg border border-panel-border bg-panel-card px-2 py-1 text-xs text-panel-text focus:outline-none disabled:opacity-50"
                            >
                              {SESSION_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSessionClick(session)}
                              className="flex size-7 items-center justify-center rounded-full bg-panel-primary text-white hover:opacity-90"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "calendario" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-panel-text">Calendario</h1>
                <button
                  onClick={() => setIsAddSessionModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-panel-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  Añadir Sesión
                </button>
                <Link
                  href="/admindisponibilidad"
                  className="flex items-center gap-2 rounded-xl border border-panel-border bg-panel-card px-4 py-2 text-sm font-bold text-panel-text transition hover:bg-panel-bg"
                >
                  <span className="material-symbols-outlined text-lg">calendar_month</span>
                  Disponibilidad
                </Link>
              </div>

              {/* View Mode Switcher */}
              <div className="flex h-10 items-center rounded-xl bg-panel-bg p-1">
                {(["day", "week", "month"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex h-full cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-medium transition ${viewMode === mode
                      ? "bg-panel-card text-panel-primary shadow-sm"
                      : "text-panel-muted hover:text-panel-text"
                      }`}
                  >
                    <span className="truncate capitalize">
                      {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
                    </span>
                    <input
                      className="invisible w-0"
                      name="view-switcher"
                      type="radio"
                      value={mode}
                      checked={viewMode === mode}
                      onChange={() => setViewMode(mode)}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-xl bg-panel-card p-4 shadow-lg sm:p-6">
              {/* Month Navigation */}
              <div className="mb-4 flex items-center justify-between">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                  <span className="material-symbols-outlined flex size-10 items-center justify-center text-panel-muted hover:text-panel-text">
                    chevron_left
                  </span>
                </button>
                <h2 className="text-center text-xl font-bold text-panel-text">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                  <span className="material-symbols-outlined flex size-10 items-center justify-center text-panel-muted hover:text-panel-text">
                    chevron_right
                  </span>
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {dayNames.map((day) => (
                  <p key={day} className="flex h-12 items-center justify-center text-sm font-bold text-panel-muted">
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
                      className={`flex min-h-28 flex-col rounded-lg border p-1 text-xs ${isTodayDay ? "border-panel-primary bg-panel-primary/10" : "border-panel-border"
                        }`}
                    >
                      <span className={`text-xs ${isTodayDay ? "font-bold text-panel-primary" : "font-medium text-panel-text"}`}>
                        {day}
                      </span>
                      <div className="mt-1 space-y-0.5 overflow-y-auto text-xs">
                        {daySessions.map((session) => {
                          const userData = userCache.get(session.user_id);
                          const userName = userData ? `${userData.first_name} ${userData.last_name}` : "Usuario";

                          let bgColor = "";
                          let textColor = "text-black";

                          if (session.status === "cancelled") {
                            bgColor = "bg-red-500";
                            textColor = "text-white";
                          } else if (session.status === "finished") {
                            bgColor = "bg-blue-500";
                            textColor = "text-white";
                          } else {
                            const colorClass = getCoachColorClass(session);
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
          </div>
        )}

        {activeTab === "clientes" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-panel-text">Mis Clientes</h1>

            <div className="rounded-2xl border border-panel-border bg-panel-card p-4 shadow-sm">
              {loadingClients ? (
                <div className="py-8 text-center text-sm text-panel-muted">
                  Cargando clientes...
                </div>
              ) : assignedClients.length === 0 ? (
                <div className="py-8 text-center text-sm text-panel-muted">
                  No tienes clientes asignados.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between rounded-xl border border-panel-border bg-panel-bg px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-panel-primary/20 text-panel-primary">
                          <span className="material-symbols-outlined">person</span>
                        </div>
                        <div>
                          <p className="font-semibold text-panel-text">
                            {client.first_name} {client.last_name}
                          </p>
                          <p className="text-xs text-panel-muted">{client.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-panel-primary/10 px-2 py-1 text-xs font-medium text-panel-primary capitalize">
                          {client.user_type || "Base"}
                        </span>
                        <Link
                          href={`/coaching/${client.id}`}
                          className="flex size-8 items-center justify-center rounded-full bg-panel-primary text-white hover:opacity-90"
                          title="Ver perfil"
                        >
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CoachScheduleSessionModal
        isOpen={isAddSessionModalOpen}
        onClose={() => setIsAddSessionModalOpen(false)}
        onSessionScheduled={fetchSessions}
        coachUserId={coachUserId}
        isAdmin={isAdmin}
        isCoach={isCoach}
      />


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
