"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import type { User, Questionnaire, QuestionnaireQuestion, QuestionType } from "@/lib/firestore-schema";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    orderBy,
    Timestamp,
} from "firebase/firestore";

export default function AdminSeguimientosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<User | null>(null);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [isCoach, setIsCoach] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Data state
    const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
    const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<Map<string, QuestionnaireQuestion[]>>(new Map());
    const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);

    // Question modal state
    const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
    const [editingQuestionnaireId, setEditingQuestionnaireId] = useState<string | null>(null);
    const [newQuestionText, setNewQuestionText] = useState("");
    const [newQuestionType, setNewQuestionType] = useState<QuestionType>("open");
    const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>([""]);
    const [savingQuestion, setSavingQuestion] = useState(false);

    // Check access
    useEffect(() => {
        const checkAccess = async () => {
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

                const userIsAdmin = Boolean(profile.is_admin);
                const userIsCoach = Boolean(profile.isCoach);

                if (!userIsAdmin && !userIsCoach) {
                    router.push("/panel");
                    return;
                }

                setIsAdmin(userIsAdmin);
                setIsCoach(userIsCoach);
                setCurrentProfile(profile);
            } catch (error) {
                console.error("Error checking access:", error);
                router.push("/");
            } finally {
                setCheckingAccess(false);
            }
        };

        checkAccess();
    }, [user, loading, router]);

    // Fetch questionnaires
    const fetchQuestionnaires = useCallback(async () => {
        if (!user) return;

        setLoadingQuestionnaires(true);
        try {
            const questionnairesRef = collection(db, "questionnaires");
            let q;

            if (isAdmin) {
                // Admin sees all
                q = query(questionnairesRef, orderBy("created_at", "desc"));
            } else {
                // Coach sees only their own
                q = query(
                    questionnairesRef,
                    where("created_by", "==", user.uid),
                    orderBy("created_at", "desc")
                );
            }

            const snapshot = await getDocs(q);
            const data: Questionnaire[] = [];

            snapshot.forEach((docItem) => {
                data.push({
                    id: docItem.id,
                    ...docItem.data(),
                    created_at: docItem.data().created_at?.toDate?.() || new Date(),
                    updated_at: docItem.data().updated_at?.toDate?.() || new Date(),
                } as Questionnaire);
            });

            setQuestionnaires(data);
        } catch (error) {
            console.error("Error fetching questionnaires:", error);
        } finally {
            setLoadingQuestionnaires(false);
        }
    }, [user, isAdmin]);

    useEffect(() => {
        if (currentProfile && (isAdmin || isCoach)) {
            fetchQuestionnaires();
        }
    }, [currentProfile, isAdmin, isCoach, fetchQuestionnaires]);

    // Fetch questions for a questionnaire
    const fetchQuestions = async (questionnaireId: string) => {
        setLoadingQuestions(questionnaireId);
        try {
            const questionsRef = collection(db, "questionnaire_questions");
            const q = query(
                questionsRef,
                where("questionnaire_id", "==", questionnaireId),
                orderBy("order", "asc")
            );

            const snapshot = await getDocs(q);
            const data: QuestionnaireQuestion[] = [];

            snapshot.forEach((docItem) => {
                data.push({
                    id: docItem.id,
                    ...docItem.data(),
                    created_at: docItem.data().created_at?.toDate?.() || new Date(),
                } as QuestionnaireQuestion);
            });

            setQuestions((prev) => {
                const next = new Map(prev);
                next.set(questionnaireId, data);
                return next;
            });
        } catch (error) {
            console.error("Error fetching questions:", error);
        } finally {
            setLoadingQuestions(null);
        }
    };

    // Toggle expand questionnaire
    const handleToggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
        } else {
            setExpandedId(id);
            if (!questions.has(id)) {
                await fetchQuestions(id);
            }
        }
    };

    // Add questionnaire
    const handleAddQuestionnaire = async () => {
        if (!newTitle.trim() || !user) return;

        setSavingQuestionnaire(true);
        try {
            await addDoc(collection(db, "questionnaires"), {
                title: newTitle.trim(),
                created_by: user.uid,
                created_at: Timestamp.now(),
                updated_at: Timestamp.now(),
                status: "draft",
            });

            setNewTitle("");
            setIsAddModalOpen(false);
            await fetchQuestionnaires();
        } catch (error) {
            console.error("Error adding questionnaire:", error);
        } finally {
            setSavingQuestionnaire(false);
        }
    };

    // Delete questionnaire
    const handleDeleteQuestionnaire = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar este seguimiento?")) return;

        try {
            // Delete all questions first
            const questionsRef = collection(db, "questionnaire_questions");
            const q = query(questionsRef, where("questionnaire_id", "==", id));
            const snapshot = await getDocs(q);

            const deletePromises = snapshot.docs.map((docItem) =>
                deleteDoc(doc(db, "questionnaire_questions", docItem.id))
            );
            await Promise.all(deletePromises);

            // Delete questionnaire
            await deleteDoc(doc(db, "questionnaires", id));

            // Update local state
            setQuestionnaires((prev) => prev.filter((q) => q.id !== id));
            setQuestions((prev) => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });

            if (expandedId === id) {
                setExpandedId(null);
            }
        } catch (error) {
            console.error("Error deleting questionnaire:", error);
        }
    };

    // Open add question modal
    const handleOpenAddQuestion = (questionnaireId: string) => {
        setEditingQuestionnaireId(questionnaireId);
        setNewQuestionText("");
        setNewQuestionType("open");
        setNewQuestionOptions([""]);
        setIsAddQuestionModalOpen(true);
    };

    // Add question
    const handleAddQuestion = async () => {
        if (!newQuestionText.trim() || !editingQuestionnaireId) return;

        setSavingQuestion(true);
        try {
            const currentQuestions = questions.get(editingQuestionnaireId) || [];
            const nextOrder = currentQuestions.length;

            const questionData: Record<string, unknown> = {
                questionnaire_id: editingQuestionnaireId,
                question_text: newQuestionText.trim(),
                question_type: newQuestionType,
                order: nextOrder,
                created_at: Timestamp.now(),
            };

            if (newQuestionType === "multiple_choice") {
                questionData.options = newQuestionOptions.filter((opt) => opt.trim() !== "");
            }

            await addDoc(collection(db, "questionnaire_questions"), questionData);

            // Update questionnaire's updated_at
            await updateDoc(doc(db, "questionnaires", editingQuestionnaireId), {
                updated_at: Timestamp.now(),
            });

            setIsAddQuestionModalOpen(false);
            await fetchQuestions(editingQuestionnaireId);
        } catch (error) {
            console.error("Error adding question:", error);
        } finally {
            setSavingQuestion(false);
        }
    };

    // Delete question
    const handleDeleteQuestion = async (questionId: string, questionnaireId: string) => {
        if (!confirm("¿Eliminar esta pregunta?")) return;

        try {
            await deleteDoc(doc(db, "questionnaire_questions", questionId));
            await fetchQuestions(questionnaireId);
        } catch (error) {
            console.error("Error deleting question:", error);
        }
    };

    // Add option input
    const handleAddOption = () => {
        setNewQuestionOptions((prev) => [...prev, ""]);
    };

    // Update option
    const handleUpdateOption = (index: number, value: string) => {
        setNewQuestionOptions((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    // Remove option
    const handleRemoveOption = (index: number) => {
        setNewQuestionOptions((prev) => prev.filter((_, i) => i !== index));
    };

    if (loading || checkingAccess) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
                    <p className="text-sm text-panel-muted">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!currentProfile || (!isAdmin && !isCoach)) {
        return null;
    }

    return (
        <div className="min-h-screen py-8">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 md:px-8">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-panel-text">Seguimientos</h1>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-panel-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nuevo Seguimiento
                    </button>
                </div>

                {/* Questionnaires list */}
                <div className="space-y-4">
                    {loadingQuestionnaires ? (
                        <div className="rounded-xl border border-panel-border bg-panel-card p-8 text-center text-panel-muted">
                            Cargando seguimientos...
                        </div>
                    ) : questionnaires.length === 0 ? (
                        <div className="rounded-xl border border-panel-border bg-panel-card p-8 text-center text-panel-muted">
                            No hay seguimientos creados.
                        </div>
                    ) : (
                        questionnaires.map((questionnaire) => {
                            const isExpanded = expandedId === questionnaire.id;
                            const questionList = questions.get(questionnaire.id) || [];

                            return (
                                <div
                                    key={questionnaire.id}
                                    className="rounded-xl border border-panel-border bg-panel-card overflow-hidden"
                                >
                                    {/* Header */}
                                    <div
                                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-panel-bg/50 transition"
                                        onClick={() => handleToggleExpand(questionnaire.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-panel-primary">
                                                {isExpanded ? "expand_less" : "expand_more"}
                                            </span>
                                            <div>
                                                <h3 className="font-semibold text-panel-text">{questionnaire.title}</h3>
                                                <p className="text-xs text-panel-muted">
                                                    {questionList.length || "0"} preguntas
                                                    {isAdmin && questionnaire.created_by !== user?.uid && (
                                                        <span className="ml-2 text-panel-primary">(otro coach)</span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteQuestionnaire(questionnaire.id);
                                            }}
                                            className="flex size-8 items-center justify-center rounded-full text-panel-muted hover:bg-red-100 hover:text-red-500 transition"
                                            title="Eliminar"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>

                                    {/* Expanded content */}
                                    {isExpanded && (
                                        <div className="border-t border-panel-border bg-panel-bg/30 p-4">
                                            {loadingQuestions === questionnaire.id ? (
                                                <p className="text-sm text-panel-muted">Cargando preguntas...</p>
                                            ) : (
                                                <>
                                                    {/* Questions list */}
                                                    <div className="space-y-2 mb-4">
                                                        {questionList.length === 0 ? (
                                                            <p className="text-sm text-panel-muted">No hay preguntas todavía.</p>
                                                        ) : (
                                                            questionList.map((question, idx) => (
                                                                <div
                                                                    key={question.id}
                                                                    className="flex items-start gap-3 rounded-lg border border-panel-border bg-panel-card p-3"
                                                                >
                                                                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-panel-primary/10 text-xs font-bold text-panel-primary">
                                                                        {idx + 1}
                                                                    </span>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-panel-text">
                                                                            {question.question_text}
                                                                        </p>
                                                                        {question.question_type === "open" ? (
                                                                            <span className="text-xs text-panel-muted">
                                                                                Respuesta abierta
                                                                            </span>
                                                                        ) : (
                                                                            <div className="mt-1 space-y-0.5">
                                                                                {question.options?.map((opt, optIdx) => (
                                                                                    <p key={optIdx} className="text-xs text-panel-muted">
                                                                                        • {opt}
                                                                                    </p>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteQuestion(question.id, questionnaire.id)
                                                                        }
                                                                        className="flex size-6 items-center justify-center rounded-full text-panel-muted hover:bg-red-100 hover:text-red-500 transition"
                                                                        title="Eliminar pregunta"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">close</span>
                                                                    </button>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>

                                                    {/* Add question button */}
                                                    <button
                                                        onClick={() => handleOpenAddQuestion(questionnaire.id)}
                                                        className="flex items-center gap-2 rounded-lg border border-dashed border-panel-border px-3 py-2 text-sm font-medium text-panel-muted hover:border-panel-primary hover:text-panel-primary transition"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">add</span>
                                                        Agregar pregunta
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Add Questionnaire Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-panel-card p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-panel-text">Nuevo Seguimiento</h2>
                        <input
                            type="text"
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Título del seguimiento"
                            className="mb-4 w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text placeholder:text-panel-muted focus:border-panel-primary focus:outline-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsAddModalOpen(false);
                                    setNewTitle("");
                                }}
                                className="rounded-xl border border-panel-border px-4 py-2 text-sm font-medium text-panel-text hover:bg-panel-bg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddQuestionnaire}
                                disabled={!newTitle.trim() || savingQuestionnaire}
                                className="rounded-xl bg-panel-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                            >
                                {savingQuestionnaire ? "Guardando..." : "Crear"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Question Modal */}
            {isAddQuestionModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-panel-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="mb-4 text-xl font-bold text-panel-text">Nueva Pregunta</h2>

                        {/* Question text */}
                        <div className="mb-4">
                            <label className="mb-1 block text-sm font-medium text-panel-text">Pregunta</label>
                            <textarea
                                value={newQuestionText}
                                onChange={(e) => setNewQuestionText(e.target.value)}
                                placeholder="Escribe la pregunta..."
                                rows={3}
                                className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text placeholder:text-panel-muted focus:border-panel-primary focus:outline-none"
                                autoFocus
                            />
                        </div>

                        {/* Question type */}
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium text-panel-text">
                                Tipo de respuesta
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setNewQuestionType("open")}
                                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${newQuestionType === "open"
                                            ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                                            : "border-panel-border text-panel-muted hover:border-panel-primary/50"
                                        }`}
                                >
                                    <span className="material-symbols-outlined mb-1 block text-2xl">edit_note</span>
                                    Respuesta abierta
                                </button>
                                <button
                                    onClick={() => setNewQuestionType("multiple_choice")}
                                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition ${newQuestionType === "multiple_choice"
                                            ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                                            : "border-panel-border text-panel-muted hover:border-panel-primary/50"
                                        }`}
                                >
                                    <span className="material-symbols-outlined mb-1 block text-2xl">
                                        check_box
                                    </span>
                                    Opción múltiple
                                </button>
                            </div>
                        </div>

                        {/* Options for multiple choice */}
                        {newQuestionType === "multiple_choice" && (
                            <div className="mb-4">
                                <label className="mb-2 block text-sm font-medium text-panel-text">Opciones</label>
                                <div className="space-y-2">
                                    {newQuestionOptions.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => handleUpdateOption(idx, e.target.value)}
                                                placeholder={`Opción ${idx + 1}`}
                                                className="flex-1 rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm text-panel-text placeholder:text-panel-muted focus:border-panel-primary focus:outline-none"
                                            />
                                            {newQuestionOptions.length > 1 && (
                                                <button
                                                    onClick={() => handleRemoveOption(idx)}
                                                    className="flex size-8 items-center justify-center rounded-full text-panel-muted hover:bg-red-100 hover:text-red-500 transition"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAddOption}
                                    className="mt-2 flex items-center gap-1 text-sm font-medium text-panel-primary hover:underline"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Agregar opción
                                </button>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsAddQuestionModalOpen(false)}
                                className="rounded-xl border border-panel-border px-4 py-2 text-sm font-medium text-panel-text hover:bg-panel-bg transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddQuestion}
                                disabled={!newQuestionText.trim() || savingQuestion}
                                className="rounded-xl bg-panel-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
                            >
                                {savingQuestion ? "Guardando..." : "Agregar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
