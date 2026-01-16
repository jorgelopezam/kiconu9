"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    getAllCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    getAllUsers,
    assignCourseToUser,
    removeCourseFromUser,
    getUsersWithCourseAccess,
    getUserProfile,
} from "@/lib/firestore-helpers";
import type { Course, CourseAccessLevel, CourseStatus, User } from "@/lib/firestore-schema";

export default function AdminCursosPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    // Create course form state
    const [newTitle, setNewTitle] = useState("");
    const [newAccessLevel, setNewAccessLevel] = useState<CourseAccessLevel>("base");
    const [newStatus, setNewStatus] = useState<CourseStatus>("active");
    const [creating, setCreating] = useState(false);

    // Edit course form state
    const [editTitle, setEditTitle] = useState("");
    const [editAccessLevel, setEditAccessLevel] = useState<CourseAccessLevel>("base");
    const [editStatus, setEditStatus] = useState<CourseStatus>("active");
    const [updating, setUpdating] = useState(false);

    // Assign users state
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [savingAssignments, setSavingAssignments] = useState(false);

    // Check admin status
    useEffect(() => {
        const checkAdmin = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }
            try {
                const profile = await getUserProfile(user.uid);
                setIsAdmin(Boolean(profile?.is_admin));
            } catch {
                setIsAdmin(false);
            }
        };
        checkAdmin();
    }, [user]);

    // Redirect non-admins
    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        } else if (!loading && user && !isAdmin && !loadingCourses) {
            router.push("/panel");
        }
    }, [user, loading, isAdmin, loadingCourses, router]);

    // Fetch courses
    const fetchCourses = useCallback(async () => {
        setLoadingCourses(true);
        try {
            const coursesData = await getAllCourses();
            setCourses(coursesData);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoadingCourses(false);
        }
    }, []);

    useEffect(() => {
        if (user && isAdmin) {
            fetchCourses();
        }
    }, [user, isAdmin, fetchCourses]);

    // Handle create course
    const handleCreateCourse = async () => {
        if (!newTitle.trim() || !user) return;

        setCreating(true);
        try {
            await createCourse(newTitle.trim(), newAccessLevel, newStatus, user.uid);
            setNewTitle("");
            setNewAccessLevel("base");
            setNewStatus("active");
            setShowCreateModal(false);
            await fetchCourses();
        } catch (error) {
            console.error("Error creating course:", error);
        } finally {
            setCreating(false);
        }
    };

    // Handle toggle status
    const handleToggleStatus = async (course: Course) => {
        const newStatusValue: CourseStatus = course.status === "active" ? "inactive" : "active";
        try {
            await updateCourse(course.id, { status: newStatusValue });
            await fetchCourses();
        } catch (error) {
            console.error("Error updating course:", error);
        }
    };

    // Open edit modal
    const openEditModal = (course: Course) => {
        setSelectedCourse(course);
        setEditTitle(course.title);
        setEditAccessLevel(course.access_level);
        setEditStatus(course.status);
        setShowEditModal(true);
    };

    // Handle update course
    const handleUpdateCourse = async () => {
        if (!selectedCourse || !editTitle.trim()) return;

        setUpdating(true);
        try {
            await updateCourse(selectedCourse.id, {
                title: editTitle.trim(),
                access_level: editAccessLevel,
                status: editStatus,
            });
            setShowEditModal(false);
            setSelectedCourse(null);
            await fetchCourses();
        } catch (error) {
            console.error("Error updating course:", error);
        } finally {
            setUpdating(false);
        }
    };

    // Handle delete course
    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar este curso?")) return;
        try {
            await deleteCourse(courseId);
            setShowEditModal(false);
            setSelectedCourse(null);
            await fetchCourses();
        } catch (error) {
            console.error("Error deleting course:", error);
        }
    };

    // Open assign modal
    const openAssignModal = async (course: Course) => {
        setSelectedCourse(course);
        setShowAssignModal(true);
        setLoadingUsers(true);

        try {
            const [users, assignedUsers] = await Promise.all([
                getAllUsers(),
                getUsersWithCourseAccess(course.id),
            ]);
            setAllUsers(users.filter(u => !u.is_admin)); // Exclude admins
            setAssignedUserIds(new Set(assignedUsers.map(u => u.user_id)));
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoadingUsers(false);
        }
    };

    // Handle user assignment toggle
    const toggleUserAssignment = (userId: string) => {
        setAssignedUserIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    // Save assignments
    const saveAssignments = async () => {
        if (!selectedCourse) return;

        setSavingAssignments(true);
        try {
            const currentAssigned = await getUsersWithCourseAccess(selectedCourse.id);
            const currentIds = new Set(currentAssigned.map(u => u.user_id));

            // Users to add
            for (const userId of assignedUserIds) {
                if (!currentIds.has(userId)) {
                    await assignCourseToUser(userId, selectedCourse.id);
                }
            }

            // Users to remove
            for (const userId of currentIds) {
                if (!assignedUserIds.has(userId)) {
                    await removeCourseFromUser(userId, selectedCourse.id);
                }
            }

            setShowAssignModal(false);
            setSelectedCourse(null);
        } catch (error) {
            console.error("Error saving assignments:", error);
        } finally {
            setSavingAssignments(false);
        }
    };

    const accessLevelLabels: Record<CourseAccessLevel, string> = {
        restricted: "Restringido",
        base: "Base",
        kiconu: "Kiconu",
        premium: "Premium",
        all: "Todos",
    };

    if (loading || loadingCourses) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-foreground">Cargando...</div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto flex max-w-6xl flex-col gap-6  py-10 md:px-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-foreground">Admin Cursos</h1>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Nuevo Curso
                    </button>
                </div>

                {/* Courses Table */}
                <div className="overflow-x-auto rounded-xl border border-sage/30 bg-surface">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-sage/20 bg-desert-sand/10">
                                <th className="px-2 py-2.5 text-left text-sm font-semibold text-foreground md:px-4 md:py-3">Título</th>
                                <th className="px-2 py-2.5 text-left text-sm font-semibold text-foreground md:px-4 md:py-3">Acceso</th>
                                <th className="px-2 py-2.5 text-left text-sm font-semibold text-foreground md:px-4 md:py-3">Estado</th>
                                <th className="px-2 py-2.5 text-right text-sm font-semibold text-foreground md:px-4 md:py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {courses.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay cursos creados. Crea uno nuevo para comenzar.
                                    </td>
                                </tr>
                            ) : (
                                courses.map((course) => (
                                    <tr key={course.id} className="border-b border-sage/10 last:border-0">
                                        <td className="px-2 py-2 text-sm text-foreground md:px-4 md:py-3">
                                            <button
                                                onClick={() => openEditModal(course)}
                                                className="text-left font-medium text-primary hover:underline"
                                            >
                                                {course.title}
                                            </button>
                                        </td>
                                        <td className="px-2 py-2 md:px-4 md:py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium md:px-2.5 md:py-1 ${course.access_level === "restricted"
                                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                                : course.access_level === "premium"
                                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                    : course.access_level === "kiconu"
                                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                        : "bg-sage/20 text-foreground"
                                                }`}>
                                                {accessLevelLabels[course.access_level]}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 md:px-4 md:py-3">
                                            <button
                                                onClick={() => handleToggleStatus(course)}
                                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition md:px-2.5 md:py-1 ${course.status === "active"
                                                    ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400"
                                                    : "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400"
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-xs md:text-sm">
                                                    {course.status === "active" ? "check_circle" : "cancel"}
                                                </span>
                                                {course.status === "active" ? "Activo" : "Inactivo"}
                                            </button>
                                        </td>
                                        <td className="px-2 py-2 md:px-4 md:py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                {course.access_level === "restricted" && (
                                                    <button
                                                        onClick={() => openAssignModal(course)}
                                                        className="flex items-center gap-1 rounded-lg border border-sage/30 px-2 py-1 text-xs font-medium text-foreground transition hover:bg-desert-sand/20 md:px-3 md:py-1.5"
                                                    >
                                                        <span className="material-symbols-outlined text-sm">group_add</span>
                                                        <span className="hidden md:inline">Asignar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-foreground">Crear Nuevo Curso</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Título</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Nombre del curso"
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Nivel de Acceso</label>
                                <select
                                    value={newAccessLevel}
                                    onChange={(e) => setNewAccessLevel(e.target.value as CourseAccessLevel)}
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="all">Todos (visto por todos los suscriptores)</option>
                                    <option value="restricted">Restringido (asignar individualmente)</option>
                                    <option value="base">Base (todos los usuarios base+)</option>
                                    <option value="kiconu">Kiconu (usuarios kiconu+)</option>
                                    <option value="premium">Premium (solo usuarios premium)</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Estado</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value as CourseStatus)}
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateCourse}
                                disabled={creating || !newTitle.trim()}
                                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                            >
                                {creating ? "Creando..." : "Crear Curso"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Course Modal */}
            {showEditModal && selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-foreground">Editar Curso</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Título</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    placeholder="Nombre del curso"
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Nivel de Acceso</label>
                                <select
                                    value={editAccessLevel}
                                    onChange={(e) => setEditAccessLevel(e.target.value as CourseAccessLevel)}
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="all">Todos (visto por todos los suscriptores)</option>
                                    <option value="restricted">Restringido (asignar individualmente)</option>
                                    <option value="base">Base (todos los usuarios base+)</option>
                                    <option value="kiconu">Kiconu (usuarios kiconu+)</option>
                                    <option value="premium">Premium (solo usuarios premium)</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Estado</label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value as CourseStatus)}
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                >
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap-reverse items-center justify-between gap-4">
                            <button
                                onClick={() => handleDeleteCourse(selectedCourse.id)}
                                className="flex items-center gap-1 rounded-xl px-2 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/10"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                Eliminar Curso
                            </button>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedCourse(null);
                                    }}
                                    className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateCourse}
                                    disabled={updating || !editTitle.trim()}
                                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                                >
                                    {updating ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Users Modal */}
            {showAssignModal && selectedCourse && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
                        <h2 className="mb-2 text-xl font-bold text-foreground">Asignar Usuarios</h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Curso: <span className="font-medium text-foreground">{selectedCourse.title}</span>
                        </p>

                        {loadingUsers ? (
                            <div className="py-8 text-center text-muted-foreground">Cargando usuarios...</div>
                        ) : (
                            <div className="max-h-80 overflow-y-auto rounded-xl border border-sage/30">
                                {allUsers.length === 0 ? (
                                    <div className="py-8 text-center text-muted-foreground">No hay usuarios disponibles.</div>
                                ) : (
                                    allUsers.map((u) => (
                                        <label
                                            key={u.user_id}
                                            className="flex cursor-pointer items-center gap-3 border-b border-sage/10 px-4 py-3 transition hover:bg-desert-sand/10 last:border-0"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={assignedUserIds.has(u.user_id)}
                                                onChange={() => toggleUserAssignment(u.user_id)}
                                                className="size-4 rounded border-sage/40 text-primary focus:ring-primary/40"
                                            />
                                            <div>
                                                <div className="text-sm font-medium text-foreground">
                                                    {u.first_name} {u.last_name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">{u.email}</div>
                                            </div>
                                            {u.user_type && (
                                                <span className="ml-auto rounded-full bg-sage/20 px-2 py-0.5 text-xs text-muted-foreground">
                                                    {u.user_type}
                                                </span>
                                            )}
                                        </label>
                                    ))
                                )}
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedCourse(null);
                                }}
                                className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveAssignments}
                                disabled={savingAssignments}
                                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                            >
                                {savingAssignments ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
