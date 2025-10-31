"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EditSessionModal } from "@/components/panel/EditSessionModal";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import { useRouter } from "next/navigation";

type NavigationItem = {
  label: string;
  icon: string;
  href: string;
};

type SessionData = {
  id: string;
  user_id: string;
  day: Timestamp;
  time: string;
  duration: number;
  status: "scheduled" | "finished" | "cancelled";
  coach: "Nutricion" | "Transpersonal";
  stage: string;
  title: string;
};

type UserData = {
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
};

type UserSearchResult = {
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

const marketingTodos = [
  {
    title: "1 Historia y 1 Reel Instagram",
    schedule: "11 de Ago, 2024 - 02:00 PM",
  },
  {
    title: "Enviar video muestra a Jorge como esté",
    schedule: "14 de Ago, 2024 - 10:00 AM",
  },
  {
    title: "Registrar Dominio kiconu.com",
    schedule: "18 de Ago, 2024 - 06:00 PM",
  },
];

const clientStats = [
  {
    label: "Usuarios registrados este mes",
    value: "28",
  },
  {
    label: "Nuevos coachees Kiconu",
    value: "7",
  },
  {
    label: "Ingresos registrados este mes",
    value: "$1,850.00",
  },
];

export default function PanelCoachPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserData | null>(null);
  const [userCache, setUserCache] = useState<Map<string, UserData>>(new Map());
  const userCacheRef = useRef(userCache);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const [sessionFilter, setSessionFilter] = useState<"all" | "nutricion" | "transpersonal">("all");
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  const performUserSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const lowercaseQuery = query.trim().toLowerCase();
        const usersRef = collection(db, "users");
        const userSnapshot = await getDocs(usersRef);

        const results: UserSearchResult[] = [];

        userSnapshot.forEach((docItem) => {
          const data = docItem.data();
          const firstName = (data.first_name as string | undefined) ?? "";
          const lastName = (data.last_name as string | undefined) ?? "";
          const email = (data.email as string | undefined) ?? "";

          const haystack = `${firstName} ${lastName} ${email}`.toLowerCase();
          if (haystack.includes(lowercaseQuery)) {
            results.push({
              id: docItem.id,
              first_name: firstName,
              last_name: lastName,
              email,
              user_type: (data.user_type as string | undefined) ?? "",
            });
          }
        });

        setSearchResults(results.slice(0, 10));
      } catch (error) {
        console.error("Error performing user search:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  const debouncedSearch = useMemo(() => {
    return (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        void performUserSearch(query);
      }, 250);
    };
  }, [performUserSearch]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setLoadingSessions(false);
          setSessions([]);
        }
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (isMounted) {
          setIsAdmin(Boolean(profile?.is_admin));
        }
      } catch (error) {
        console.error("Error loading user profile: ", error);
        if (isMounted) {
          setIsAdmin(false);
          setLoadingSessions(false);
          setSessions([]);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    userCacheRef.current = userCache;
  }, [userCache]);

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const sessionsRef = collection(db, "sessions");
      const sessionsQuery = query(
        sessionsRef,
        where("status", "==", "scheduled"),
        orderBy("day", "asc"),
        limit(5)
      );

      const snapshot = await getDocs(sessionsQuery);
      const loadedSessions: SessionData[] = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...(docItem.data() as Omit<SessionData, "id">),
      }));

      setSessions(loadedSessions);

      const uniqueUserIds = new Set(loadedSessions.map((session) => session.user_id));
      const cacheCopy = new Map(userCacheRef.current);
      let cacheUpdated = false;

      for (const userId of uniqueUserIds) {
        if (!cacheCopy.has(userId)) {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const data = userDoc.data();
              cacheCopy.set(userId, {
                first_name: (data.first_name as string) || "",
                last_name: (data.last_name as string) || "",
                email: (data.email as string) || "",
                user_type: (data.user_type as string) || "",
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
    } catch (error) {
      console.error("Error fetching sessions:", error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      fetchSessions();
    }
  }, [user, isAdmin, fetchSessions]);

  const ensureUserDetails = useCallback(async (userId: string) => {
    const cached = userCacheRef.current.get(userId);
    if (cached) {
      return cached;
    }

    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const details: UserData = {
          first_name: (data.first_name as string) || "",
          last_name: (data.last_name as string) || "",
          email: (data.email as string) || "",
          user_type: (data.user_type as string) || "",
        };
        const newCache = new Map(userCacheRef.current);
        newCache.set(userId, details);
        userCacheRef.current = newCache;
        setUserCache(newCache);
        return details;
      }
    } catch (error) {
      console.error("Error ensuring user details:", error);
    }

    return null;
  }, []);

  const handleStatusChange = useCallback(
    async (session: SessionData, newStatus: SessionData["status"]) => {
      if (session.status === newStatus) return;

      try {
        setUpdatingSessionId(session.id);
        const sessionRef = doc(db, "sessions", session.id);
        await updateDoc(sessionRef, {
          status: newStatus,
          updated_at: Timestamp.now(),
        });

        await fetchSessions();
      } catch (error) {
        console.error("Error updating session status:", error);
      } finally {
        setUpdatingSessionId(null);
      }
    },
    [fetchSessions]
  );

  const handleReprogram = useCallback(
    async (session: SessionData) => {
      const details = await ensureUserDetails(session.user_id);
      if (!details) {
        console.warn(`No se encontraron detalles del usuario ${session.user_id} para reprogramar la sesión.`);
        return;
      }

      setSelectedSession(session);
      setSelectedUserDetails(details);
      setIsEditModalOpen(true);
    },
    [ensureUserDetails]
  );

  const handleModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedSession(null);
    setSelectedUserDetails(null);
  }, []);

  const handleSessionUpdated = useCallback(() => {
    fetchSessions();
  }, [fetchSessions]);

  const getUserDisplayName = (session: SessionData) => {
    const details = userCache.get(session.user_id);
    if (!details) {
      return "Usuario";
    }

    const fullName = `${details.first_name} ${details.last_name}`.trim();
    if (fullName) {
      return fullName;
    }

    return details.email || "Usuario";
  };

  const formatSessionSchedule = (session: SessionData) => {
    const date = session.day.toDate();
    const formattedDate = date.toLocaleDateString("es-MX", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const formattedTime = date.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${formattedDate} · ${formattedTime}`;
  };

  const isSessionOverdue = (session: SessionData) => {
    if (session.status !== "scheduled") {
      return false;
    }

    const sessionDate = session.day.toDate();
    return sessionDate < new Date();
  };

  const getCoachStyles = (coach: SessionData["coach"]) => {
    if (coach === "Nutricion") {
      return {
        badgeBg: "bg-green-500/15",
        badgeText: "text-green-600",
        dot: "bg-green-400",
        icon: "restaurant" as const,
        label: "Nutrición",
      };
    }

    return {
      badgeBg: "bg-yellow-500/15",
      badgeText: "text-yellow-600",
      dot: "bg-yellow-400",
      icon: "self_improvement" as const,
      label: "Transpersonal",
    };
  };

  const getStatusLabel = (status: SessionData["status"]) => {
    return SESSION_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
  };

  const filteredSessions = useMemo(() => {
    if (sessionFilter === "all") {
      return sessions;
    }

    return sessions.filter((session) =>
      sessionFilter === "nutricion" ? session.coach === "Nutricion" : session.coach === "Transpersonal"
    );
  }, [sessions, sessionFilter]);

  const sessionFilterLabel = useMemo(() => {
    switch (sessionFilter) {
      case "nutricion":
        return "Nutrición";
      case "transpersonal":
        return "Transpersonal";
      default:
        return "Todas";
    }
  }, [sessionFilter]);

  const handleToggleFilterMenu = useCallback(() => {
    setIsFilterMenuOpen((prev) => !prev);
  }, []);

  const handleSelectFilter = useCallback((type: "all" | "nutricion" | "transpersonal") => {
    setSessionFilter(type);
    setIsFilterMenuOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setSearchQuery(value);
      debouncedSearch(value);
    },
    [debouncedSearch]
  );

  const handleSelectUser = useCallback(
    (userId: string) => {
      setSearchQuery("");
      setSearchResults([]);
      router.push(`/coaching/${userId}`);
    },
    [router]
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchResults([]);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setIsFilterMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const navigationItems: NavigationItem[] = [
    {
      label: "Calendario",
      icon: "calendar_month",
      href: "/calendario",
    },
    {
      label: "Usuarios",
      icon: "group",
      href: "/admin",
    },
    {
      label: "Videos",
      icon: "movie",
      href: "/videoadmin",
    },
    {
      label: "Meditaciones",
      icon: "self_improvement",
      href: "/meditar",
    },
    {
      label: "Marketing",
      icon: "campaign",
      href: "/marketing",
    },
  ];

  return (
    <div className="py-10">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="flex w-full flex-col justify-between gap-8 rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm lg:w-64 lg:flex-shrink-0">
          <div className="flex flex-col gap-6">
            <nav className="flex flex-col gap-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-panel-muted transition-colors hover:bg-panel-border/60 hover:text-panel-text"
                >
                  <span className="material-symbols-outlined text-base transition-colors text-panel-muted group-hover:text-panel-primary">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4 border-t border-panel-border pt-6"></div>
        </aside>

        <main className="flex-1">
          <div className="flex flex-col gap-8">

            <div className="relative" ref={searchContainerRef}>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-panel-muted">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar usuarios por nombre o email"
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full rounded-xl border border-panel-border bg-panel-card py-2.5 pl-10 pr-4 text-sm text-panel-text shadow-sm outline-none transition focus:border-panel-primary focus:ring-2 focus:ring-panel-primary/20"
              />

              {(searchResults.length > 0 || (isSearching && searchQuery)) && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-panel-border bg-panel-card shadow-lg">
                  <div className="max-h-72 overflow-y-auto">
                    {isSearching ? (
                      <div className="px-4 py-3 text-sm text-panel-muted">Buscando usuarios...</div>
                    ) : (
                      searchResults.map((result) => {
                        const fullName = `${result.first_name} ${result.last_name}`.trim();
                        return (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleSelectUser(result.id)}
                            className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left text-sm transition hover:bg-panel-border/60"
                          >
                            <span className="font-semibold text-panel-text">
                              {fullName || result.email || "Usuario"}
                            </span>
                            {fullName && (
                              <span className="text-xs text-panel-muted">{result.email}</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {!isSearching && searchResults.length === 0 && searchQuery && (
                    <div className="px-4 py-3 text-sm text-panel-muted">No se encontraron usuarios.</div>
                  )}
                </div>
              )}
            </div>

            <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-panel-border bg-panel-card p-3 shadow-sm xl:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center justify-between gap-6">
                    <h3 className="text-lg font-bold text-panel-text">Próximas Sesiones</h3>
                    <div className="relative" ref={filterMenuRef}>
                      <button
                        type="button"
                        onClick={handleToggleFilterMenu}
                        className="inline-flex items-center gap-2 rounded-lg border border-panel-border bg-panel-bg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-panel-muted transition hover:border-panel-primary hover:text-panel-text"
                      >
                        <span className="material-symbols-outlined text-sm">filter_alt</span>
                        {sessionFilterLabel}
                        <span className="material-symbols-outlined text-sm">
                          {isFilterMenuOpen ? "expand_less" : "expand_more"}
                        </span>
                      </button>

                      {isFilterMenuOpen && (
                        <div className="absolute left-0 top-full z-30 mt-2 w-44 overflow-hidden rounded-xl border border-panel-border bg-panel-card shadow-lg">
                          {[
                            { key: "all", label: "Todas" },
                            { key: "nutricion", label: "Nutrición" },
                            { key: "transpersonal", label: "Transpersonal" },
                          ].map((option) => (
                            <button
                              key={option.key}
                              type="button"
                              onClick={() => handleSelectFilter(option.key as typeof sessionFilter)}
                              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition hover:bg-panel-border/60 ${
                                sessionFilter === option.key ? "text-panel-text" : "text-panel-muted"
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {option.key === "nutricion"
                                  ? "restaurant"
                                  : option.key === "transpersonal"
                                  ? "self_improvement"
                                  : "filter_alt"}
                              </span>
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  {loadingSessions ? (
                    <div className="rounded-xl border border-panel-border bg-panel-bg px-4 py-6 text-center text-sm text-panel-muted">
                      Cargando sesiones programadas...
                    </div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-panel-border bg-panel-bg px-4 py-6 text-center text-sm text-panel-muted">
                      No hay sesiones programadas próximamente.
                    </div>
                  ) : (
                    filteredSessions.map((session) => {
                      const coachStyles = getCoachStyles(session.coach);
                      const overdue = isSessionOverdue(session);
                      const isUpdating = updatingSessionId === session.id;
                      const displayName = getUserDisplayName(session);
                      const schedule = formatSessionSchedule(session);

                      return (
                        <div
                          key={session.id}
                          className={`rounded-xl border px-4 py-2 text-sm shadow-sm transition duration-200 ${
                            overdue
                              ? "border-red-400/80 bg-red-500/5"
                              : "border-panel-border bg-panel-bg"
                          }`}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col  items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={`text-xs font-bold ${overdue ? "text-red-600" : "text-panel-text"}`}>
                                  {schedule}
                                </p>
                                
                                {overdue && (
                                  <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
                                    Vencida
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <select
                                  value={session.status}
                                  onChange={(event) =>
                                    handleStatusChange(session, event.target.value as SessionData["status"])
                                  }
                                  disabled={isUpdating}
                                  className="rounded-lg border border-panel-border bg-panel-card px-3 py-1 text-xs   tracking-wide text-panel-text outline-none transition focus:border-panel-primary disabled:opacity-50"
                                >
                                  {SESSION_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  onClick={() => handleReprogram(session)}
                                  className="flex size-5 items-center justify-center rounded-full bg-panel-primary text-white transition hover:opacity-90 disabled:opacity-50"
                                  title="Reprogramar"
                                  disabled={isUpdating}
                                >
                                  <span className="material-symbols-outlined text-base">schedule</span>
                                </button>
                              </div>
                            </div>

                            <div className="flex  gap-4 justify-between">
                              <p className="  text-panel-text">{displayName}</p>
                              <span
                                  className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs  ${coachStyles.badgeBg} ${coachStyles.badgeText}`}
                                >
                                  <span className={`size-1.5 rounded-full ${coachStyles.dot}`}></span>
                                  {coachStyles.label}
                                </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm">
                <h3 className="text-lg font-bold text-panel-text">Por hacer (Marketing)</h3>
                <div className="mt-4 flex flex-col gap-3">
                  {marketingTodos.map((task) => (
                    <div
                      key={task.title}
                      className="flex items-center gap-3 rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-sm shadow-sm"
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-panel-primary/20 text-panel-primary">
                        <span className="material-symbols-outlined">checklist</span>
                      </div>
                      <div className="flex flex-col">
                        <p className="font-semibold text-panel-text">{task.title}</p>
                        <p className="text-xs text-panel-muted">{task.schedule}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm">
              <h3 className="text-lg font-bold text-panel-text">Estadísticas de Nuevos Clientes</h3>
              <div className="mt-4 flex flex-col gap-4">
                {clientStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between rounded-xl bg-panel-bg px-4 py-3 text-sm">
                    <p className="text-panel-muted">{stat.label}</p>
                    <p className="font-bold text-panel-text">{stat.value}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
      <EditSessionModal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        onSessionUpdated={handleSessionUpdated}
        session={selectedSession}
        userDetails={selectedUserDetails}
      />
    </div>
  );
}
