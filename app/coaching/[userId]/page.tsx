"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
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
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { getUserProfile } from "@/lib/firestore-helpers";
import type {
  User,
  Course,
  UserType,
  AssignedQuestionnaire,
  AssignedQuestionnaireQuestion,
  Questionnaire,
  QuestionnaireQuestion,
  QuestionType,
  CoachingQuestion
} from "@/lib/firestore-schema";
import { COLLECTIONS } from "@/lib/firestore-schema";

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

const TAB_ITEMS = ["sesiones", "entradas", "objetivos", "seguimientos"] as const;
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

function formatDate(ts: Timestamp | Date | null | undefined) {
  if (!ts) return "";
  const date = ts instanceof Timestamp ? ts.toDate() : ts;
  return date.toLocaleString("es-MX", {
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
  const [assignedQuestionnaires, setAssignedQuestionnaires] = useState<AssignedQuestionnaire[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assigned Questionnaire State
  const [isAssignQuestionnaireOpen, setIsAssignQuestionnaireOpen] = useState(false);
  const [newQuestionnaireTitle, setNewQuestionnaireTitle] = useState("");
  const [questionsToAdd, setQuestionsToAdd] = useState<Partial<AssignedQuestionnaireQuestion>[]>([]);
  const [isImportModuleOpen, setIsImportModuleOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState<Questionnaire[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
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

  // Coaching Questions state
  const [coachingQuestions, setCoachingQuestions] = useState<CoachingQuestion[]>([]);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [selectFromExistingOpen, setSelectFromExistingOpen] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<QuestionnaireQuestion[]>([]);
  const [loadingAvailableQuestions, setLoadingAvailableQuestions] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>("open");
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>([""]);
  const [savingQuestion, setSavingQuestion] = useState(false);

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

        const userIsAdmin = profile.is_admin === true;
        const userIsCoach = profile.isCoach === true;

        // If not admin and not coach, redirect to panel
        if (!userIsAdmin && !userIsCoach) {
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

        // If coach (not admin), verify they have access to this client
        if (!userIsAdmin && userIsCoach) {
          const assignedCoaches = target.assignedCoaches || [];
          if (!assignedCoaches.includes(user.uid)) {
            setError("No tienes acceso a este cliente.");
            return;
          }
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

        // Fetch assigned questionnaires
        const assignedQQuery = query(
          collection(db, "assigned_questionnaires"),
          where("user_id", "==", requestedUserId)
        );
        const assignedQSnapshot = await getDocs(assignedQQuery);
        if (!isMounted) return;

        const loadedAssignedQ = assignedQSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          created_at: doc.data().created_at?.toDate() || new Date(),
          updated_at: doc.data().updated_at?.toDate() || new Date(),
        })) as AssignedQuestionnaire[];

        // Sort by date descending
        loadedAssignedQ.sort((a, b) => {
          const timeA = a.created_at instanceof Date ? a.created_at.getTime() : 0;
          const timeB = b.created_at instanceof Date ? b.created_at.getTime() : 0;
          return timeB - timeA;
        });

        setAssignedQuestionnaires(loadedAssignedQ);
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
    () => ({
      sesiones: sessions.length,
      entradas: journalEntries.length,
      objetivos: 0,
      seguimientos: assignedQuestionnaires.length
    }),
    [sessions.length, journalEntries.length, assignedQuestionnaires.length]
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

  // Fetch coaching questions
  const fetchCoachingQuestions = useCallback(async () => {
    if (!requestedUserId) return;

    try {
      const q = query(
        collection(db, COLLECTIONS.COACHING_QUESTIONS),
        where("user_id", "==", requestedUserId)
      );
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        created_at: docSnap.data().created_at?.toDate() || new Date(),
        answered_at: docSnap.data().answered_at?.toDate() || undefined,
      })) as CoachingQuestion[];
      
      // Sort client-side by created_at descending
      loaded.sort((a, b) => {
        const timeA = a.created_at?.getTime() || 0;
        const timeB = b.created_at?.getTime() || 0;
        return timeB - timeA;
      });
      
      setCoachingQuestions(loaded);
    } catch (err) {
      console.error("Error fetching coaching questions:", err);
    }
  }, [requestedUserId]);

  useEffect(() => {
    if (user && requestedUserId && (viewerProfile?.is_admin || viewerProfile?.isCoach)) {
      fetchCoachingQuestions();
    }
  }, [user, requestedUserId, viewerProfile, fetchCoachingQuestions]);

  // Fetch available questions from seguimientos
  const fetchAvailableQuestions = async () => {
    setLoadingAvailableQuestions(true);
    try {
      // Get all questionnaires (both active and draft)
      const questionnairesRef = collection(db, COLLECTIONS.QUESTIONNAIRES);
      let q;
      if (viewerProfile?.is_admin) {
        // Admin sees all questionnaires
        q = query(questionnairesRef, orderBy("created_at", "desc"));
      } else {
        // Coach sees only their own
        q = query(questionnairesRef, where("created_by", "==", user!.uid), orderBy("created_at", "desc"));
      }
      const questionnairesSnapshot = await getDocs(q);
      const questionnaireIds = questionnairesSnapshot.docs.map(d => d.id);

      if (questionnaireIds.length === 0) {
        setAvailableQuestions([]);
        return;
      }

      // Get all questions from those questionnaires (max 10 at a time due to Firestore "in" limit)
      const questionsRef = collection(db, COLLECTIONS.QUESTIONNAIRE_QUESTIONS);
      const idsToQuery = questionnaireIds.slice(0, 10);
      const questionsQuery = query(questionsRef, where("questionnaire_id", "in", idsToQuery), orderBy("order", "asc"));
      const questionsSnapshot = await getDocs(questionsQuery);

      const loaded = questionsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        created_at: docSnap.data().created_at?.toDate() || new Date(),
      })) as QuestionnaireQuestion[];

      setAvailableQuestions(loaded);
    } catch (err) {
      console.error("Error fetching available questions:", err);
    } finally {
      setLoadingAvailableQuestions(false);
    }
  };

  // Add coaching question
  const handleAddCoachingQuestion = async () => {
    if (!newQuestionText.trim() || !requestedUserId || !user) return;

    setSavingQuestion(true);
    try {
      const questionData: Record<string, unknown> = {
        user_id: requestedUserId,
        assigned_by: user.uid,
        question_text: newQuestionText.trim(),
        question_type: newQuestionType,
        is_open_answer: newQuestionType === "open",
        status: "pending",
        created_at: Timestamp.now(),
      };

      if (newQuestionType === "multiple_choice") {
        questionData.options = newQuestionOptions.filter(opt => opt.trim() !== "");
      }

      await addDoc(collection(db, COLLECTIONS.COACHING_QUESTIONS), questionData);

      // Reset and close
      setNewQuestionText("");
      setNewQuestionType("open");
      setNewQuestionOptions([""]);
      setIsAddQuestionDialogOpen(false);
      await fetchCoachingQuestions();
    } catch (err) {
      console.error("Error adding coaching question:", err);
      alert("Error al agregar la pregunta.");
    } finally {
      setSavingQuestion(false);
    }
  };

  // Select existing question
  const handleSelectExistingQuestion = async (question: QuestionnaireQuestion) => {
    if (!requestedUserId || !user) return;

    setSavingQuestion(true);
    try {
      const questionData: Record<string, unknown> = {
        user_id: requestedUserId,
        assigned_by: user.uid,
        question_text: question.question_text,
        question_type: question.question_type,
        is_open_answer: question.question_type === "open",
        status: "pending",
        created_at: Timestamp.now(),
      };

      // Only add options if it's multiple choice and has options
      if (question.question_type === "multiple_choice" && question.options && question.options.length > 0) {
        questionData.options = question.options;
      }

      await addDoc(collection(db, COLLECTIONS.COACHING_QUESTIONS), questionData);

      setSelectFromExistingOpen(false);
      await fetchCoachingQuestions();
    } catch (err) {
      console.error("Error selecting question:", err);
      alert("Error al seleccionar la pregunta.");
    } finally {
      setSavingQuestion(false);
    }
  };

  // Delete coaching question
  const handleDeleteCoachingQuestion = async (questionId: string) => {
    if (!confirm("¿Eliminar esta pregunta?")) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.COACHING_QUESTIONS, questionId));
      await fetchCoachingQuestions();
    } catch (err) {
      console.error("Error deleting question:", err);
    }
  };

  // Add option for multiple choice
  const handleAddOption = () => {
    setNewQuestionOptions(prev => [...prev, ""]);
  };

  // Update option
  const handleUpdateOption = (index: number, value: string) => {
    setNewQuestionOptions(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Remove option
  const handleRemoveOption = (index: number) => {
    setNewQuestionOptions(prev => prev.filter((_, i) => i !== index));
  };

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

  // --- Assigned Questionnaires Handlers ---

  const loadModules = async () => {
    setLoadingModules(true);
    try {
      let q;
      if (viewerProfile?.is_admin) {
        q = query(collection(db, "questionnaires"), where("status", "==", "active"), orderBy("created_at", "desc"));
      } else {
        q = query(collection(db, "questionnaires"), where("created_by", "==", user!.uid), where("status", "==", "active"), orderBy("created_at", "desc"));
      }

      const snapshot = await getDocs(q);
      const modules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Questionnaire[];
      setAvailableModules(modules);
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleOpenAssignDialog = () => {
    setIsAssignQuestionnaireOpen(true);
    setNewQuestionnaireTitle("");
    setQuestionsToAdd([]);
  };

  const handleImportModule = async () => {
    if (!selectedModuleId) return;

    setLoadingModules(true);
    try {
      const questionsRef = collection(db, "questionnaire_questions");
      const q = query(questionsRef, where("questionnaire_id", "==", selectedModuleId), orderBy("order", "asc"));
      const snapshot = await getDocs(q);

      const importedQuestions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          question_text: data.question_text,
          question_type: data.question_type,
          options: data.options,
          order: 0
        };
      });

      const startIndex = questionsToAdd.length;
      const reindexedQuestions = importedQuestions.map((q, index) => ({
        ...q,
        order: startIndex + index
      }));

      setQuestionsToAdd(prev => [...prev, ...reindexedQuestions]);
      setIsImportModuleOpen(false);
    } catch (error) {
      console.error("Error importing module:", error);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleAddQuestionLocal = (type: QuestionType) => {
    setQuestionsToAdd(prev => [
      ...prev,
      {
        question_text: "",
        question_type: type,
        options: type === "multiple_choice" ? [""] : undefined,
        order: prev.length
      }
    ]);
  };

  const handleUpdateQuestionLocal = (index: number, field: string, value: any) => {
    setQuestionsToAdd(prev => {
      const newQuestions = [...prev];
      newQuestions[index] = { ...newQuestions[index], [field]: value };
      return newQuestions;
    });
  };

  const handleUpdateOptionLocal = (qIndex: number, oIndex: number, value: string) => {
    setQuestionsToAdd(prev => {
      const newQuestions = [...prev];
      const options = [...(newQuestions[qIndex].options || [])];
      options[oIndex] = value;
      newQuestions[qIndex] = { ...newQuestions[qIndex], options };
      return newQuestions;
    });
  };

  const handleAddOptionLocal = (qIndex: number) => {
    setQuestionsToAdd(prev => {
      const newQuestions = [...prev];
      const options = [...(newQuestions[qIndex].options || []), ""];
      newQuestions[qIndex] = { ...newQuestions[qIndex], options };
      return newQuestions;
    });
  };

  const handleDeleteOptionLocal = (qIndex: number, oIndex: number) => {
    setQuestionsToAdd(prev => {
      const newQuestions = [...prev];
      const options = (newQuestions[qIndex].options || []).filter((_, i) => i !== oIndex);
      newQuestions[qIndex] = { ...newQuestions[qIndex], options };
      return newQuestions;
    });
  };

  const handleDeleteQuestionLocal = (index: number) => {
    setQuestionsToAdd(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestionnaire = async () => {
    if (!newQuestionnaireTitle.trim()) return;
    if (!user || !requestedUserId) return;

    setIsSaving(true);
    try {
      // Create assigned questionnaire
      const qRef = await addDoc(collection(db, "assigned_questionnaires"), {
        user_id: requestedUserId,
        assigned_by: user.uid,
        title: newQuestionnaireTitle,
        status: "pending",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Create questions
      const batchPromises = questionsToAdd.map(async (q, index) => {
        return addDoc(collection(db, "assigned_questionnaire_questions"), {
          assigned_questionnaire_id: qRef.id,
          user_id: requestedUserId,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options || [],
          order: index
        });
      });

      await Promise.all(batchPromises);

      // Refresh list
      const newQ: AssignedQuestionnaire = {
        id: qRef.id,
        user_id: requestedUserId,
        assigned_by: user.uid,
        title: newQuestionnaireTitle,
        status: "pending",
        created_at: new Date(),
        updated_at: new Date()
      };

      setAssignedQuestionnaires(prev => [newQ, ...prev]);
      setIsAssignQuestionnaireOpen(false);
    } catch (error) {
      console.error("Error saving assigned questionnaire:", error);
      alert("Error al asignar el cuestionario.");
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

  if (!viewerProfile || (!viewerProfile.is_admin && !viewerProfile.isCoach) || !targetProfile) {
    return null;
  }

  // Determine if viewer is admin (for showing/hiding edit buttons)
  const viewerIsAdmin = viewerProfile.is_admin === true;

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
            {viewerIsAdmin && (
              <button
                type="button"
                onClick={handleOpenAccountDialog}
                className="inline-flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-2 py-1 text-xs font-medium text-panel-text transition hover:bg-panel-border"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar Datos
              </button>
            )}
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
            {viewerIsAdmin && (
              <button
                type="button"
                onClick={handleOpenAccessDialog}
                className="inline-flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-2 py-1 text-xs font-medium text-panel-text transition hover:bg-panel-border"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Editar Accesos
              </button>
            )}
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

        {/* Seguimientos Card */}
        <section className="rounded-2xl border border-panel-border bg-panel-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-panel-text">Seguimientos</h2>
            <button
              type="button"
              onClick={() => setIsAddQuestionDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-2 py-1 text-xs font-medium text-panel-text transition hover:bg-panel-border"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Agregar Pregunta
            </button>
          </div>
          <div className="space-y-2">
            {coachingQuestions.length === 0 ? (
              <p className="text-xs text-panel-muted italic py-2">Sin preguntas de seguimiento</p>
            ) : (
              coachingQuestions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start gap-3 rounded-lg border border-panel-border bg-panel-bg p-2"
                >
                  <span className={`material-symbols-outlined text-base mt-0.5 ${q.question_type === "open" ? "text-blue-500" : "text-green-500"}`}>
                    {q.question_type === "open" ? "edit_note" : "check_box"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-panel-text truncate">{q.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${q.status === "pending" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                        {q.status === "pending" ? "Pendiente" : "Respondida"}
                      </span>
                      {q.question_type === "multiple_choice" && q.options && (
                        <span className="text-[10px] text-panel-muted">
                          {q.options.length} opciones
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCoachingQuestion(q.id)}
                    className="p-1 text-panel-muted hover:text-red-500 rounded"
                    title="Eliminar"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))
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

          {activeTab === "seguimientos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-panel-text">Seguimientos Asignados</h2>
                <button
                  type="button"
                  onClick={handleOpenAssignDialog}
                  className="inline-flex items-center gap-2 rounded-xl bg-panel-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  <span className="material-symbols-outlined">add</span>
                  Asignar Seguimiento
                </button>
              </div>

              {assignedQuestionnaires.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-panel-border bg-panel-bg/60 p-8 text-center text-panel-muted">
                  <span className="material-symbols-outlined mb-2 text-3xl opacity-50">assignment</span>
                  <p>No se han asignado seguimientos a este usuario.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {assignedQuestionnaires.map((q) => (
                    <article
                      key={q.id}
                      className="flex items-center justify-between rounded-2xl border border-panel-border bg-panel-bg p-4 transition hover:border-panel-primary/50"
                    >
                      <div>
                        <h3 className="font-semibold text-panel-text">{q.title}</h3>
                        <p className="text-sm text-panel-muted">
                          Asignado el {formatDate(q.created_at as any)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${q.status === "completed"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-600"
                            }`}
                        >
                          {q.status === "completed" ? "Completado" : "Pendiente"}
                        </span>
                        <button
                          title="Eliminar asignación (Admin/Coach)"
                          className="rounded-lg p-2 text-panel-muted hover:bg-red-500/10 hover:text-red-500"
                          onClick={async () => {
                            if (confirm("¿Estás seguro de eliminar este seguimiento? Se perderán las respuestas si existen.")) {
                              await deleteDoc(doc(db, "assigned_questionnaires", q.id));
                              setAssignedQuestionnaires(prev => prev.filter(item => item.id !== q.id));
                            }
                          }}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
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


      {/* Assign Questionnaire Dialog */}
      {
        isAssignQuestionnaireOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-panel-border bg-panel-card shadow-xl">
              <div className="border-b border-panel-border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-panel-text">Asignar Seguimiento</h3>
                  <button
                    type="button"
                    onClick={() => setIsAssignQuestionnaireOpen(false)}
                    className="rounded-lg p-1 text-panel-muted transition hover:bg-panel-border hover:text-panel-text"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-panel-text">
                      Título del Seguimiento
                    </label>
                    <input
                      type="text"
                      value={newQuestionnaireTitle}
                      onChange={(e) => setNewQuestionnaireTitle(e.target.value)}
                      placeholder="Ej. Cuestionario Inicial, Revisión Semanal..."
                      className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-2 text-panel-text outline-none focus:border-panel-primary focus:ring-1 focus:ring-panel-primary"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-panel-text">Preguntas ({questionsToAdd.length})</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            loadModules();
                            setIsImportModuleOpen(true);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-3 py-1.5 text-xs font-semibold text-panel-muted hover:border-panel-primary hover:text-panel-primary"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          Importar Módulo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestionLocal("open")}
                          className="flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-3 py-1.5 text-xs font-semibold text-panel-muted hover:border-panel-primary hover:text-panel-primary"
                        >
                          <span className="material-symbols-outlined text-sm">short_text</span>
                          Texto
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddQuestionLocal("multiple_choice")}
                          className="flex items-center gap-1 rounded-lg border border-panel-border bg-panel-bg px-3 py-1.5 text-xs font-semibold text-panel-muted hover:border-panel-primary hover:text-panel-primary"
                        >
                          <span className="material-symbols-outlined text-sm">list</span>
                          Opciones
                        </button>
                      </div>
                    </div>

                    {questionsToAdd.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-panel-border bg-panel-bg/50 p-8 text-center text-sm text-panel-muted">
                        Agrega preguntas manualmente o importa un módulo existente.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {questionsToAdd.map((q, qIndex) => (
                          <div key={qIndex} className="relative rounded-xl border border-panel-border bg-panel-bg p-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestionLocal(qIndex)}
                              className="absolute right-2 top-2 rounded-lg p-1 text-panel-muted hover:bg-red-500/10 hover:text-red-500"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>

                            <div className="mb-3 pr-8">
                              <input
                                type="text"
                                value={q.question_text}
                                onChange={(e) => handleUpdateQuestionLocal(qIndex, "question_text", e.target.value)}
                                placeholder="Escribe la pregunta..."
                                className="w-full border-none bg-transparent p-0 font-medium text-panel-text placeholder:text-panel-muted/50 focus:ring-0"
                              />
                            </div>

                            {q.question_type === "multiple_choice" && (
                              <div className="pl-4 space-y-2">
                                {q.options?.map((opt, oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm text-panel-muted">radio_button_unchecked</span>
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleUpdateOptionLocal(qIndex, oIndex, e.target.value)}
                                      placeholder={`Opción ${oIndex + 1}`}
                                      className="flex-1 rounded-lg border border-panel-border bg-panel-card px-3 py-1.5 text-sm text-panel-text outline-none focus:border-panel-primary"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteOptionLocal(qIndex, oIndex)}
                                      className="p-1 text-panel-muted hover:text-red-500"
                                      disabled={(q.options?.length || 0) <= 1}
                                    >
                                      <span className="material-symbols-outlined text-sm">close</span>
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleAddOptionLocal(qIndex)}
                                  className="text-xs font-semibold text-panel-primary hover:underline"
                                >
                                  + Agregar opción
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-panel-border p-4">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignQuestionnaireOpen(false)}
                    className="rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-panel-text transition hover:bg-panel-border"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveQuestionnaire}
                    disabled={isSaving || !newQuestionnaireTitle.trim() || questionsToAdd.length === 0}
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
                        Asignar Seguimiento
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Import Module Modal */}
      {
        isImportModuleOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl border border-panel-border bg-panel-card shadow-xl">
              <div className="border-b border-panel-border p-4">
                <h3 className="text-lg font-bold text-panel-text">Importar Módulo</h3>
              </div>
              <div className="p-4">
                {loadingModules ? (
                  <div className="flex justify-center py-8 text-panel-muted">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  </div>
                ) : availableModules.length === 0 ? (
                  <div className="py-8 text-center text-sm text-panel-muted">
                    No hay módulos disponibles.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableModules.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModuleId(m.id)}
                        className={`w-full rounded-xl border p-3 text-left transition ${selectedModuleId === m.id
                          ? "border-panel-primary bg-panel-primary/5 ring-1 ring-panel-primary"
                          : "border-panel-border bg-panel-bg hover:border-panel-primary/50"}`}
                      >
                        <div className="font-semibold text-panel-text">{m.title}</div>
                        <div className="text-xs text-panel-muted">{formatDate(m.created_at as any)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 border-t border-panel-border p-4">
                <button
                  onClick={() => setIsImportModuleOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-panel-text hover:bg-panel-bg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportModule}
                  disabled={!selectedModuleId}
                  className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Importar
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Coaching Question Dialog */}
      {isAddQuestionDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-panel-border bg-panel-card shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-panel-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-panel-text">Agregar Pregunta</h3>
                <button
                  onClick={() => {
                    setIsAddQuestionDialogOpen(false);
                    setNewQuestionText("");
                    setNewQuestionType("open");
                    setNewQuestionOptions([""]);
                  }}
                  className="rounded-lg p-1 text-panel-muted hover:text-panel-text"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Option to select from existing */}
              <button
                onClick={() => {
                  fetchAvailableQuestions();
                  setSelectFromExistingOpen(true);
                  setIsAddQuestionDialogOpen(false);
                }}
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-panel-border p-4 text-left hover:border-panel-primary hover:bg-panel-primary/5 transition"
              >
                <span className="material-symbols-outlined text-2xl text-panel-primary">library_books</span>
                <div>
                  <p className="font-medium text-panel-text">Seleccionar de Seguimientos</p>
                  <p className="text-xs text-panel-muted">Elegir una pregunta existente</p>
                </div>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-panel-border"></div>
                <span className="text-xs text-panel-muted">o crear nueva</span>
                <div className="flex-1 h-px bg-panel-border"></div>
              </div>

              {/* Create new question */}
              <div>
                <label className="mb-1 block text-sm font-medium text-panel-text">Pregunta</label>
                <textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  placeholder="Escribe la pregunta..."
                  rows={3}
                  className="w-full rounded-xl border border-panel-border bg-panel-bg px-4 py-3 text-panel-text placeholder:text-panel-muted focus:border-panel-primary focus:outline-none"
                />
              </div>

              {/* Question type */}
              <div>
                <label className="mb-2 block text-sm font-medium text-panel-text">Tipo de respuesta</label>
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
                    <span className="material-symbols-outlined mb-1 block text-2xl">check_box</span>
                    Opción múltiple
                  </button>
                </div>
              </div>

              {/* Options for multiple choice */}
              {newQuestionType === "multiple_choice" && (
                <div>
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
            </div>

            <div className="flex justify-end gap-2 border-t border-panel-border p-4">
              <button
                onClick={() => {
                  setIsAddQuestionDialogOpen(false);
                  setNewQuestionText("");
                  setNewQuestionType("open");
                  setNewQuestionOptions([""]);
                }}
                className="rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-panel-text hover:bg-panel-bg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCoachingQuestion}
                disabled={!newQuestionText.trim() || savingQuestion}
                className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50"
              >
                {savingQuestion ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select from Existing Questions Dialog */}
      {selectFromExistingOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-panel-border bg-panel-card shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-panel-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-panel-text">Seleccionar Pregunta</h3>
                <button
                  onClick={() => setSelectFromExistingOpen(false)}
                  className="rounded-lg p-1 text-panel-muted hover:text-panel-text"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-4">
              {loadingAvailableQuestions ? (
                <div className="flex justify-center py-8 text-panel-muted">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                </div>
              ) : availableQuestions.length === 0 ? (
                <div className="py-8 text-center">
                  <span className="material-symbols-outlined text-3xl text-panel-muted/50 mb-2">search_off</span>
                  <p className="text-sm text-panel-muted">No hay preguntas disponibles en los seguimientos.</p>
                  <button
                    onClick={() => {
                      setSelectFromExistingOpen(false);
                      setIsAddQuestionDialogOpen(true);
                    }}
                    className="mt-3 text-sm font-medium text-panel-primary hover:underline"
                  >
                    Crear nueva pregunta
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availableQuestions.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => handleSelectExistingQuestion(q)}
                      disabled={savingQuestion}
                      className="w-full flex items-start gap-3 rounded-xl border border-panel-border p-3 text-left hover:border-panel-primary hover:bg-panel-primary/5 transition disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-lg mt-0.5 ${q.question_type === "open" ? "text-blue-500" : "text-green-500"}`}>
                        {q.question_type === "open" ? "edit_note" : "check_box"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-panel-text line-clamp-2">{q.question_text}</p>
                        {q.question_type === "multiple_choice" && q.options && (
                          <p className="text-xs text-panel-muted mt-1">{q.options.length} opciones</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between border-t border-panel-border p-4">
              <button
                onClick={() => {
                  setSelectFromExistingOpen(false);
                  setIsAddQuestionDialogOpen(true);
                }}
                className="rounded-lg border border-panel-border px-4 py-2 text-sm font-medium text-panel-text hover:bg-panel-bg transition"
              >
                Crear Nueva
              </button>
              <button
                onClick={() => setSelectFromExistingOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-panel-text hover:bg-panel-bg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

