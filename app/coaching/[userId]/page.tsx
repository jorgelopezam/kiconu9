"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Timestamp,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore-helpers";
import type { User } from "@/lib/firestore-schema";

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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition ${
                  isActive ? "bg-panel-primary text-white" : "hover:bg-panel-border hover:text-panel-text"
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full text-xs ${
                    isActive ? "bg-white/20" : "bg-panel-border text-panel-muted"
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
    </div>
  );
}

