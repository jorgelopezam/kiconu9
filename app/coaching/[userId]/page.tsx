"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore-helpers";
import type { User, Course, UserType } from "@/lib/firestore-schema";

type SessionRecord = {
  id: string;
  day: Timestamp;
  time: string;
  status: string;
  coach?: string;
  stage?: string;
  duration?: number;
  title?: string;
};

type JournalRecord = {
  id: string;
  date_added: Timestamp;
  time?: string;
  first_question?: string;
  second_question?: string;
  third_question?: string;
};

const TAB_ITEMS = ["sesiones", "entradas", "objetivos"] as const;
type TabKey = (typeof TAB_ITEMS)[number];

const statusStyles: Record<string, string> = {
  scheduled: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  finished: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  cancelled: "border-red-500/30 bg-red-500/10 text-red-600",
};

const statusLabel: Record<string, string> = {
  scheduled: "Programada",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

function formatDate(ts: Timestamp) {
  return ts.toDate().toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CoachingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ userId?: string }>();
  const requestedUserId = Array.isArray(params?.userId)
    ? params?.userId?.[0]
    : params?.userId;

  const [activeTab, setActiveTab] = useState<TabKey>("sesiones");
  const [viewerProfile, setViewerProfile] = useState<User | null>(null);
  const [targetProfile, setTargetProfile] = useState<User | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAccessDialogOpen, setIsAccessDialogOpen] = useState(false);
  const [editedUserType, setEditedUserType] = useState<UserType>(null);
  const [editedCourseAccess, setEditedCourseAccess] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [editedAccountData, setEditedAccountData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    gender: "" as "male" | "female" | "other" | "prefer_not_to_say" | "",
    age: "" as string,
    weight: "" as string,
  });

  useEffect(() => {
    let isMounted = true;

    async function initialise() {
      if (!user || !requestedUserId) {
        return;
      }

      try {
        const profile = await getUserProfile(user.uid);
        if (!isMounted) return;

        if (!profile) {
          router.push("/");
          return;
        }

        if (!profile.is_admin) {
          router.push("/panel");
          return;
        }

        setViewerProfile(profile);

        const target = await getUserProfile(requestedUserId);
        if (!isMounted) return;

        if (!target) {
          setError("No se encontró el usuario solicitado.");
          return;
        }

        setTargetProfile(target);

        const sessionsQuery = query(
          collection(db, "sessions"),
          where("user_id", "==", requestedUserId),
          orderBy("day", "desc")
        );
        const sessionsSnapshot = await getDocs(sessionsQuery);
        if (!isMounted) return;

        const loadedSessions = sessionsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const day = data.day as Timestamp;
            if (!(day instanceof Timestamp)) return null;
            const session: SessionRecord = {
              id: doc.id,
              day,
              time: data.time ?? "",
              status: String(data.status ?? "scheduled").toLowerCase(),
            };
            if (data.coach) session.coach = data.coach;
            if (data.stage) session.stage = data.stage;
            if (typeof data.duration === "number") session.duration = data.duration;
            if (data.title) session.title = data.title;
            return session;
          })
          .filter((session): session is SessionRecord => session !== null);

        setSessions(loadedSessions);

        const journalQuery = query(
          collection(db, "journal"),
          where("user_id", "==", requestedUserId),
          orderBy("date_added", "desc")
        );
        const journalSnapshot = await getDocs(journalQuery);
        if (!isMounted) return;

        const loadedJournal = journalSnapshot.docs.map((doc) => {
          const data = doc.data();
          const date_added = data.date_added as Timestamp;
          if (!(date_added instanceof Timestamp)) return null;
          const entry: JournalRecord = {
            id: doc.id,
            date_added,
          };
          if (data.time) entry.time = data.time;
          if (data.first_question) entry.first_question = data.first_question;
          if (data.second_question) entry.second_question = data.second_question;
          if (data.third_question) entry.third_question = data.third_question;
          return entry;
        }).filter((entry): entry is JournalRecord => entry !== null);

        setJournalEntries(loadedJournal);

        // Fetch courses
        const coursesQuery = query(
          collection(db, "courses"),
          where("status", "==", "active")
        );
        const coursesSnapshot = await getDocs(coursesQuery);
        if (!isMounted) return;

        const loadedCourses = coursesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            access_level: data.access_level,
            status: data.status,
            created_at: data.created_at?.toDate() || new Date(),
            created_by: data.created_by || "",
          } as Course;
        });

        setCourses(loadedCourses);
      } catch (err) {
        console.error("Error loading coaching page:", err);
        if (!isMounted) return;
        setError("Ocurrió un error al cargar la información.");
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    }

    if (!loading && user && requestedUserId) {
      initialise();
    }

    return () => {
      isMounted = false;
    };
  }, [loading, router, user, requestedUserId]);

  const tabCounts = useMemo(
    () => ({ sesiones: sessions.length, entradas: journalEntries.length, objetivos: 0 }),
    [sessions.length, journalEntries.length]
  );

  const accessibleCourses = useMemo(() => {
    if (!targetProfile) return [];

    return courses.filter(course => {
      // Restricted access (check if user is explicitly assigned)
      if (course.access_level === "restricted") {
        return targetProfile.course_access?.includes(course.id);
      }

      // "all" access
      if (course.access_level === "all") return true;

      // User type hierarchy
      const levels = ["base", "kiconu", "premium"];
      const userLevelIndex = levels.indexOf(targetProfile.user_type || "");
      const courseLevelIndex = levels.indexOf(course.access_level);

      // If user_type is not in the list (e.g. null), they don't see level-based courses
      if (userLevelIndex === -1) return false;

      // User sees courses at their level or below
      return userLevelIndex >= courseLevelIndex;
    });
  }, [courses, targetProfile]);

  const hasKiconuAccess = targetProfile?.user_type === "kiconu" || targetProfile?.user_type === "premium";

  const handleOpenAccessDialog = () => {
    if (!targetProfile) return;
    setEditedUserType(targetProfile.user_type);
    setEditedCourseAccess(targetProfile.course_access || []);
    setIsAccessDialogOpen(true);
  };

  const handleToggleCourseAccess = (courseId: string) => {
    setEditedCourseAccess(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSaveAccess = async () => {
    if (!targetProfile || !requestedUserId) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", requestedUserId);
      await updateDoc(userRef, {
        user_type: editedUserType,
        course_access: editedCourseAccess,
      });

      // Update local state
      setTargetProfile({
        ...targetProfile,
        user_type: editedUserType,
        course_access: editedCourseAccess,
      });

      setIsAccessDialogOpen(false);
    } catch (err) {
      console.error("Error updating access:", err);
      alert("Error al guardar los cambios. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenAccountDialog = () => {
    if (!targetProfile) return;
    setEditedAccountData({
      first_name: targetProfile.first_name || "",
      last_name: targetProfile.last_name || "",
      email: targetProfile.email || "",
      gender: targetProfile.gender || "",
      age: targetProfile.age?.toString() || "",
      weight: targetProfile.weight?.toString() || "",
    });
    setIsAccountDialogOpen(true);
  };

  const handleSaveAccountData = async () => {
    if (!targetProfile || !requestedUserId) return;

    setIsSaving(true);
    try {
      const userRef = doc(db, "users", requestedUserId);
      const updateData: any = {
        first_name: editedAccountData.first_name,
        last_name: editedAccountData.last_name,
        email: editedAccountData.email,
      };

      if (editedAccountData.gender) updateData.gender = editedAccountData.gender;
      if (editedAccountData.age) updateData.age = parseInt(editedAccountData.age);
      if (editedAccountData.weight) updateData.weight = parseFloat(editedAccountData.weight);

      await updateDoc(userRef, updateData);

      // Update local state
      setTargetProfile({
        ...targetProfile,
        ...updateData,
      });

      setIsAccountDialogOpen(false);
    } catch (err) {
      console.error("Error updating account data:", err);
      alert("Error al guardar los cambios. Por favor intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!requestedUserId) {
    return (
      <div className="py-24">
        <div className="rounded-xl border border-panel-border bg-panel-card p-8 text-center text-panel-text">
          No se proporcionó un usuario válido.
        </div>
      </div>
    );
  }

  if (loading || isLoadingData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-panel-muted">Cargando tablero de coaching...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-600">
          {error}
        </div>
      </div>
    );
  }

  if (!viewerProfile || !viewerProfile.is_admin || !targetProfile) {
    return null;
  }

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-panel-border px-4 py-2 text-sm font-semibold text-panel-muted transition hover:border-panel-primary hover:text-panel-primary"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Volver
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-panel-text">
              Coaching · {targetProfile.first_name} {targetProfile.last_name}
            </h1>
            <p className="text-panel-muted">
              Visualiza el historial y contexto del usuario para preparar las próximas sesiones.
            </p>
          </div>
        </header>

        {/* Account Information Card */}
        <section className="rounded-2xl border border-panel-border bg-panel-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-panel-text">Información de Cuenta</h2>
            <button
              type="button"
              onClick={handleOpenAccountDialog}
              className="inline-flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-2 py-1 text-xs font-medium text-panel-text transition hover:bg-panel-border"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar Datos
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-panel-border bg-panel-bg p-2">
              <p className="text-[10px] uppercase tracking-wide text-panel-muted">Nombre</p>
              <p className="mt-0.5 text-sm font-semibold text-panel-text">
                {targetProfile.first_name} {targetProfile.last_name}
              </p>
            </div>
            <div className="rounded-xl border border-panel-border bg-panel-bg p-2">
              <p className="text-[10px] uppercase tracking-wide text-panel-muted">Email</p>
              <p className="mt-0.5 text-sm font-semibold text-panel-text">{targetProfile.email}</p>
            </div>
            <div className="rounded-xl border border-panel-border bg-panel-bg p-2">
              <p className="text-[10px] uppercase tracking-wide text-panel-muted">Género</p>
              <p className="mt-0.5 text-sm font-semibold text-panel-text">
                {targetProfile.gender === "male"
                  ? "Masculino"
                  : targetProfile.gender === "female"
                    ? "Femenino"
                    : targetProfile.gender === "other"
                      ? "Otro"
                      : targetProfile.gender === "prefer_not_to_say"
                        ? "Prefiero no decir"
                        : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-panel-border bg-panel-bg p-2">
              <p className="text-[10px] uppercase tracking-wide text-panel-muted">Edad</p>
              <p className="mt-0.5 text-sm font-semibold text-panel-text">
                {targetProfile.age ? `${targetProfile.age} años` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-panel-border bg-panel-bg p-2">
              <p className="text-[10px] uppercase tracking-wide text-panel-muted">Peso al Registrarse</p>
              <p className="mt-0.5 text-sm font-semibold text-panel-text">
                {targetProfile.weight ? `${targetProfile.weight} kg` : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Authorized Content Section */}
        <section className="rounded-2xl border border-panel-border bg-panel-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-panel-text">Tipo de Usuario</h2>
              <span
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${targetProfile.user_type === "base"
                  ? "border-amber-700/30 bg-amber-700/10 text-amber-700"
                  : targetProfile.user_type === "kiconu"
                    ? "border-slate-400/30 bg-slate-400/10 text-slate-600"
                    : targetProfile.user_type === "premium"
                      ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-600"
                      : "border-panel-border bg-panel-bg text-panel-muted"
                  }`}
              >
                {targetProfile.user_type === "base"
                  ? "Base"
                  : targetProfile.user_type === "kiconu"
                    ? "Kiconu"
                    : targetProfile.user_type === "premium"
                      ? "Premium"
                      : "Sin tipo"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleOpenAccessDialog}
              className="inline-flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-2 py-1 text-xs font-medium text-panel-text transition hover:bg-panel-border"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Editar Accesos
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasKiconuAccess && (
              <div className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5">
                <span className="material-symbols-outlined text-base text-blue-600">star</span>
                <span className="text-sm font-semibold text-blue-600">Programa Kiconu</span>
              </div>
            )}
            {accessibleCourses.map((course) => (
              <div
                key={course.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel-bg px-3 py-1.5"
              >
                <span className="material-symbols-outlined text-base text-panel-muted">school</span>
                <span className="text-sm font-medium text-panel-text">{course.title}</span>
              </div>
            ))}
            {!hasKiconuAccess && accessibleCourses.length === 0 && (
              <p className="text-xs text-panel-muted italic">Sin contenido autorizado</p>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-panel-border bg-panel-card p-6">
            <h2 className="mb-4 text-xl font-bold text-panel-text">Historial de Peso</h2>
            <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-panel-border bg-panel-bg text-panel-muted">
              Gráfico de peso (dummy)
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-panel-border bg-panel-card p-6">
              <h2 className="mb-2 text-xl font-bold text-panel-text">Resumen Alimentario</h2>
              <p className="text-sm leading-relaxed text-panel-muted">
                Información mockup sobre hábitos alimentarios del usuario. Incluye patrones de consumo,
                preferencias, restricciones y oportunidades de mejora.
              </p>
            </div>
            <div className="rounded-3xl border border-panel-border bg-panel-card p-6">
              <h2 className="mb-2 text-xl font-bold text-panel-text">Perfil Psicológico</h2>
              <p className="text-sm leading-relaxed text-panel-muted">
                Texto mockup con observaciones del coach transpersonal, señales de progreso emocional y
                recomendaciones de seguimiento.
              </p>
            </div>
          </div>
        </section>

        <nav className="flex flex-wrap gap-2 rounded-3xl border border-panel-border bg-panel-card p-2 text-sm font-semibold text-panel-muted">
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition ${isActive ? "bg-panel-primary text-white" : "hover:bg-panel-border hover:text-panel-text"
                  }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full text-xs ${isActive ? "bg-white/20" : "bg-panel-border text-panel-muted"
                    }`}
                >
                  {tabCounts[tab] ?? 0}
                </span>
              </button>
            );
          })}
        </nav>

        <section className="rounded-3xl border border-panel-border bg-panel-card p-6">
          {activeTab === "sesiones" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-panel-text">Sesiones de coaching</h2>
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-panel-border bg-panel-bg/60 p-6 text-center text-panel-muted">
                  No hay sesiones registradas todavía.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const badgeStyle = statusStyles[session.status] ?? statusStyles.scheduled;
                    const label = statusLabel[session.status] ?? statusLabel.scheduled;

                    return (
                      <article
                        key={session.id}
                        className="grid gap-3 rounded-2xl border border-panel-border bg-panel-bg p-4 md:grid-cols-[2fr_1fr_1fr]"
                      >
                        <div>
                          <p className="text-base font-semibold text-panel-text">
                            {session.title || (session.coach ? `Sesión ${session.coach}` : "Sesión 1-on-1")}
                          </p>
                          <p className="text-sm text-panel-muted">
                            {formatDate(session.day)}
                            {session.time ? ` · ${session.time}` : ""}
                          </p>
                        </div>
                        <div className="rounded-xl border border-panel-border bg-panel-card px-4 py-3 text-sm text-panel-muted">
                          <span className="block text-xs uppercase tracking-wide">Coach</span>
                          <span className="mt-1 block font-semibold text-panel-text">
                            {session.coach || "Pendiente"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeStyle}`}
                          >
                            {label}
                          </span>
                          <span className="text-sm text-panel-muted">
                            {session.duration ? `${session.duration} min` : "—"}
                          </span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "entradas" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-panel-text">Entradas de journal</h2>
              {journalEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-panel-border bg-panel-bg/60 p-6 text-center text-panel-muted">
                  El usuario aún no ha registrado entradas.
                </div>
              ) : (
                <div className="space-y-3">
                  {journalEntries.map((entry) => (
                    <article key={entry.id} className="space-y-3 rounded-2xl border border-panel-border bg-panel-bg p-4">
                      <header className="flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-wide text-panel-muted">
                          {formatDate(entry.date_added)}
                        </span>
                        {entry.time && (
                          <span className="text-xs text-panel-muted">Hora registrada: {entry.time}</span>
                        )}
                      </header>
                      {entry.first_question && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">
                            Reflexión 1
                          </p>
                          <p className="text-sm text-panel-text">{entry.first_question}</p>
                        </div>
                      )}
                      {entry.second_question && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">
                            Reflexión 2
                          </p>
                          <p className="text-sm text-panel-text">{entry.second_question}</p>
                        </div>
                      )}
                      {entry.third_question && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-panel-muted">
                            Reflexión 3
                          </p>
                          <p className="text-sm text-panel-text">{entry.third_question}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "objetivos" && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-panel-text">Objetivos del usuario</h2>
              <p className="rounded-2xl border border-panel-border bg-panel-bg p-6 text-sm leading-relaxed text-panel-muted">
                Esta sección mostrará los objetivos personalizados cuando la tabla correspondiente esté disponible.
                Por ahora se presenta contenido mockup para ilustrar el diseño: metas a corto plazo, indicadores de
                progreso y recordatorios de acompañamiento.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Access Management Dialog */}
      {isAccessDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-panel-border bg-panel-card shadow-xl">
            <div className="border-b border-panel-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-panel-text">Editar Accesos</h3>
                <button
                  type="button"
                  onClick={() => setIsAccessDialogOpen(false)}
                  className="rounded-lg p-1 text-panel-muted transition hover:bg-panel-border hover:text-panel-text"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              {/* User Type Selection */}
              <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-panel-border pb-4">
                <label className="text-sm font-semibold text-panel-text">
                  Tipo de Usuario:
                </label>
                {[
                  { value: "base", label: "Base", icon: "person" },
                  { value: "kiconu", label: "Kiconu", icon: "fitness_center" },
                  { value: "premium", label: "Premium", icon: "workspace_premium" },
                ].map((type) => (
                  <button
                    key={type.value || "null"}
                    type="button"
                    onClick={() => setEditedUserType(type.value as UserType)}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-center transition ${editedUserType === type.value
                      ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                      : "border-panel-border bg-panel-card text-panel-muted hover:border-panel-primary/50 hover:text-panel-text"
                      }`}
                  >
                    <span className="material-symbols-outlined text-base">{type.icon}</span>
                    <span className="text-xs font-semibold">{type.label}</span>
                  </button>
                ))}
              </div>

              {/* Course Access */}
              <div>
                <h4 className="mb-3 text-sm font-semibold text-panel-text">
                  Cursos con Acceso Restringido
                </h4>
                {courses.filter(c => c.access_level === "restricted").length === 0 ? (
                  <p className="rounded-lg border border-dashed border-panel-border bg-panel-bg p-4 text-center text-sm text-panel-muted">
                    No hay cursos con acceso restringido disponibles
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {courses
                      .filter(c => c.access_level === "restricted")
                      .map((course) => (
                        <label
                          key={course.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg border border-panel-border bg-panel-bg px-2.5 py-2 transition hover:bg-panel-border"
                        >
                          <input
                            type="checkbox"
                            checked={editedCourseAccess.includes(course.id)}
                            onChange={() => handleToggleCourseAccess(course.id)}
                            className="h-4 w-4 rounded border-panel-border text-panel-primary focus:ring-2 focus:ring-panel-primary/20"
                          />
                          <p className="text-sm font-medium text-panel-text">{course.title}</p>
                        </label>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-panel-border p-4">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccessDialogOpen(false)}
                  className="rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-panel-text transition hover:bg-panel-border"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccess}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel-primary/90 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Data Edit Dialog */}
      {isAccountDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-panel-border bg-panel-card shadow-xl">
            <div className="border-b border-panel-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-panel-text">Editar Datos de Cuenta</h3>
                <button
                  type="button"
                  onClick={() => setIsAccountDialogOpen(false)}
                  className="rounded-lg p-1 text-panel-muted transition hover:bg-panel-border hover:text-panel-text"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
              <div className="space-y-3">
                {/* First Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-panel-text">Nombre</label>
                  <input
                    type="text"
                    value={editedAccountData.first_name}
                    onChange={(e) => setEditedAccountData({ ...editedAccountData, first_name: e.target.value })}
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-panel-text">Apellido</label>
                  <input
                    type="text"
                    value={editedAccountData.last_name}
                    onChange={(e) => setEditedAccountData({ ...editedAccountData, last_name: e.target.value })}
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-panel-text">Email</label>
                  <input
                    type="email"
                    value={editedAccountData.email}
                    onChange={(e) => setEditedAccountData({ ...editedAccountData, email: e.target.value })}
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-panel-text">Género</label>
                  <select
                    value={editedAccountData.gender}
                    onChange={(e) => setEditedAccountData({ ...editedAccountData, gender: e.target.value as any })}
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                    <option value="other">Otro</option>
                    <option value="prefer_not_to_say">Prefiero no decir</option>
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-panel-text">Edad</label>
                  <input
                    type="number"
                    value={editedAccountData.age}
                    onChange={(e) => setEditedAccountData({ ...editedAccountData, age: e.target.value })}
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  />
                </div>

                {/* Weight */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-panel-text">Peso al Registrarse (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editedAccountData.weight}
                    onChange={(e) => setEditedAccountData({ ...editedAccountData, weight: e.target.value })}
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-panel-border p-4">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountDialogOpen(false)}
                  className="rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-panel-text transition hover:bg-panel-border"
                  disabled={isSaving}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccountData}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-panel-primary/90 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

