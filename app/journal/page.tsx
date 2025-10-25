"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db, COLLECTIONS } from "@/lib/firestore";

const JOURNAL_QUESTIONS = [
  {
    key: "first_question",
    prompt: "¿Cómo me quiero sentir durante el día?",
    helperText:
      "Visualiza las emociones y la energía con la que deseas vivir hoy. Permítete soñar en grande.",
  },
  {
    key: "second_question",
    prompt:
      "¿Cuáles son los posibles retos que puedo encontrar hoy para sentirme como deseo?",
    helperText:
      "Identifica obstáculos reales o mentales que podrían aparecer para que puedas anticiparte a ellos.",
  },
  {
    key: "third_question",
    prompt:
      "¿Cuál es la acción más importante que puedo tomar hoy para sentir que estoy progresando hacia mis objetivos establecidos en mi programa de coaching?",
    helperText:
      "Elige un paso concreto y alcanzable que te acerque a la persona que quieres ser.",
  },
] as const;

type JournalQuestionKey = (typeof JOURNAL_QUESTIONS)[number]["key"];

type JournalAnswers = Record<JournalQuestionKey, string>;

const INITIAL_ANSWERS: JournalAnswers = {
  first_question: "",
  second_question: "",
  third_question: "",
};

type JournalHistoryEntry = {
  id: string;
  date: Date;
  time: string;
  first_question: string;
  second_question: string;
  third_question: string;
};

export default function JournalPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<JournalAnswers>(INITIAL_ANSWERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalHistoryEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      setIsModalOpen(true);
    }
  }, [loading, user]);

  const fetchEntries = useCallback(async () => {
    if (!user) return;

    setLoadingEntries(true);
    setLoadError(null);

    try {
      const journalRef = collection(db, COLLECTIONS.JOURNAL);
      const entriesQuery = query(
        journalRef,
        where("user_id", "==", user.uid),
        orderBy("date_added", "desc")
      );

      const snapshot = await getDocs(entriesQuery);
      const history: JournalHistoryEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const rawDate = data.date_added;
        const dateValue = typeof rawDate?.toDate === "function" ? rawDate.toDate() : new Date(rawDate);

        return {
          id: docSnap.id,
          date: dateValue,
          time: data.time ?? "",
          first_question: data.first_question ?? "",
          second_question: data.second_question ?? "",
          third_question: data.third_question ?? "",
        };
      });

      setEntries(history);
    } catch (error) {
      console.error("Error loading journal entries:", error);
      setLoadError("No se pudieron cargar tus entradas. Intenta más tarde.");
    } finally {
      setLoadingEntries(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [fetchEntries, user]);

  useEffect(() => {
    if (isModalOpen) {
      const timer = window.setTimeout(() => {
        textareaRefs.current[currentStep]?.focus();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [currentStep, isModalOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentQuestion = JOURNAL_QUESTIONS[currentStep];
  const isLastStep = currentStep === JOURNAL_QUESTIONS.length - 1;
  const currentAnswer = answers[currentQuestion.key];
  const isCurrentAnswerEmpty = currentAnswer.trim().length === 0;
  const progress = ((currentStep + 1) / JOURNAL_QUESTIONS.length) * 100;

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.key]: value,
    }));
  };

  const resetForm = () => {
    setAnswers({ ...INITIAL_ANSWERS });
    setCurrentStep(0);
    setSaveError(null);
  };

  const handleStartNewEntry = () => {
    resetForm();
    setSuccessMessage(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);
    setSaveError(null);

    try {
      const now = new Date();

      await addDoc(collection(db, COLLECTIONS.JOURNAL), {
        user_id: user.uid,
        date_added: Timestamp.fromDate(now),
        time: now.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        first_question: answers.first_question.trim(),
        second_question: answers.second_question.trim(),
        third_question: answers.third_question.trim(),
      });

      setSuccessMessage(
        "Tus reflexiones han sido guardadas. ¡Que tengas un día enfocado y consciente!"
      );
      resetForm();
      setIsModalOpen(false);
      await fetchEntries();
    } catch (error) {
      console.error("Error saving journal entry:", error);
      setSaveError("Ocurrió un error al guardar tu entrada. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (isLastStep) {
      await handleSubmit();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, JOURNAL_QUESTIONS.length - 1));
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[960px] flex-col px-4 py-8 sm:px-10">
        <h1 className="pb-4 text-left text-3xl font-bold leading-tight tracking-tight text-panel-text sm:text-4xl">
          Diario
        </h1>

        {successMessage && (
          <div className="mb-4 rounded-xl border border-sage/30 bg-green-500/10 p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl text-green-500">task_alt</span>
              <div>
                <p className="text-base font-semibold text-foreground">Entrada guardada</p>
                <p className="text-sm text-muted-foreground">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-panel-border bg-panel-card p-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-5xl text-panel-primary">edit_note</span>
              <div>
                <h2 className="text-2xl font-semibold text-panel-text">Reflexiona antes de comenzar tu día</h2>
                <p className="mt-2 text-panel-muted">
                  Responde a estas tres preguntas guiadas para alinear tus emociones, anticipar retos y comprometerte con una acción concreta.
                </p>
              </div>
            </div>

            <button
              onClick={handleStartNewEntry}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-panel-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-panel-primary/90"
            >
              <span className="material-symbols-outlined text-xl">auto_fix_high</span>
              Registrar nueva entrada
            </button>
          </div>
        </div>

        <section className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-panel-text">Historial de entradas</h2>
            {loadingEntries && (
              <span className="text-sm text-muted-foreground">Cargando...</span>
            )}
          </div>

          {loadError && (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-500">
              {loadError}
            </div>
          )}

          {!loadingEntries && !loadError && entries.length === 0 && (
            <div className="rounded-lg border border-sage/30 bg-desert-sand/10 p-4 text-sm text-muted-foreground">
              Aún no has registrado entradas. Comienza con la guía para crear tu primera reflexión.
            </div>
          )}

          <div className="space-y-3">
            {entries.map((entry) => {
              const formattedDate = entry.date.toLocaleDateString("es-MX", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-sage/30 bg-surface p-4 shadow-sm"
                >
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-panel-text">
                      <span className="material-symbols-outlined text-base text-panel-primary">calendar_month</span>
                      <span>{formattedDate}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      {entry.time}
                    </span>
                  </header>

                  <div className="mt-3 grid gap-3 text-sm text-foreground md:grid-cols-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-panel-text">¿Cómo me quiero sentir hoy?</p>
                      <p className="rounded-lg bg-desert-sand/20 p-3 leading-relaxed text-muted-foreground">
                        {entry.first_question || "Sin respuesta"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-panel-text">Posibles retos</p>
                      <p className="rounded-lg bg-desert-sand/20 p-3 leading-relaxed text-muted-foreground">
                        {entry.second_question || "Sin respuesta"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-panel-text">Acción clave</p>
                      <p className="rounded-lg bg-desert-sand/20 p-3 leading-relaxed text-muted-foreground">
                        {entry.third_question || "Sin respuesta"}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="relative w-full max-w-3xl rounded-2xl border border-sage/30 bg-surface shadow-2xl">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition hover:bg-desert-sand/30 hover:text-foreground"
              aria-label="Cerrar"
              disabled={isSubmitting}
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="flex flex-col gap-6 p-8">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-panel-muted">
                  Paso {currentStep + 1} de {JOURNAL_QUESTIONS.length}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-panel-text">{currentQuestion.prompt}</h2>
                <p className="mt-3 text-sm text-muted-foreground">{currentQuestion.helperText}</p>
              </div>

              <div className="h-2 w-full rounded-full bg-sage/20">
                <div
                  className="h-2 rounded-full bg-panel-primary transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="relative overflow-hidden">
                <div
                  className="flex w-full transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentStep * 100}%)` }}
                >
                  {JOURNAL_QUESTIONS.map((question, index) => (
                    <div key={question.key} className="w-full flex-shrink-0">
                      <textarea
                        ref={(el) => {
                          textareaRefs.current[index] = el;
                        }}
                        value={answers[question.key]}
                        onChange={(event) => {
                          const value = event.target.value;
                          setAnswers((prev) => ({
                            ...prev,
                            [question.key]: value,
                          }));
                        }}
                        onKeyDown={(event) => {
                          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                            event.preventDefault();
                            if (!isSubmitting && !answers[question.key].trim()) return;
                            if (index === JOURNAL_QUESTIONS.length - 1) {
                              handleSubmit();
                            } else {
                              setCurrentStep((prev) => Math.min(prev + 1, JOURNAL_QUESTIONS.length - 1));
                            }
                          }
                        }}
                        className="min-h-[220px] w-full resize-none rounded-xl border border-sage/40 bg-desert-sand/20 px-5 py-4 text-base text-foreground shadow-inner transition focus:border-panel-primary focus:outline-none focus:ring-2 focus:ring-panel-primary/30"
                        placeholder="Escribe aquí tus pensamientos..."
                        disabled={isSubmitting && index !== currentStep}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-500">
                  {saveError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {isLastStep ? "Presiona ⌘+Enter o Ctrl+Enter para terminar" : "Presiona ⌘+Enter o Ctrl+Enter para continuar"}
                </span>
                <button
                  onClick={handleNext}
                  disabled={isSubmitting || isCurrentAnswerEmpty}
                  className="inline-flex items-center gap-3 rounded-xl bg-panel-primary px-6 py-3 text-base font-semibold text-white transition hover:bg-panel-primary/90 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      {isLastStep ? "Terminar" : "Siguiente"}
                      <span className="material-symbols-outlined text-3xl">arrow_forward</span>
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
