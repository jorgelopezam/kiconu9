"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    getAllUsers,
    getUserProfile,
    getCoachUsers,
    getUsersByCoach,
    updateUserCoaches,
} from "@/lib/firestore-helpers";
import type { User as FirestoreUser } from "@/lib/firestore-schema";

function getInitials(firstName?: string, lastName?: string, fallback?: string): string {
    const candidates = [firstName, lastName].filter(Boolean) as string[];

    if (candidates.length === 0) {
        return fallback?.charAt(0).toUpperCase() || "K";
    }

    const initials = candidates
        .map((name) => name.trim().charAt(0).toUpperCase())
        .join("");

    return initials.slice(0, 2);
}

type UserAssignmentModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userIds: string[]) => Promise<void>;
    allUsers: FirestoreUser[];
    currentUsers: string[];
    coachName: string;
};

function UserAssignmentModal({
    isOpen,
    onClose,
    onSave,
    allUsers,
    currentUsers,
    coachName,
}: UserAssignmentModalProps) {
    const [selectedUsers, setSelectedUsers] = useState<string[]>(currentUsers);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            setSelectedUsers(currentUsers);
            setError(null);
            setSearchQuery("");
        }
    }, [currentUsers, isOpen]);

    const handleToggleUser = (userId: string) => {
        setSelectedUsers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await onSave(selectedUsers);
            onClose();
        } catch (err) {
            console.error("Error saving users:", err);
            setError(
                err instanceof Error ? err.message : "Error al guardar. Intenta de nuevo."
            );
        } finally {
            setSaving(false);
        }
    };

    // Filter non-coach users by search
    const filteredUsers = useMemo(() => {
        const nonCoachUsers = allUsers.filter((u) => !u.isCoach);
        if (!searchQuery.trim()) return nonCoachUsers;

        const query = searchQuery.toLowerCase();
        return nonCoachUsers.filter((user) => {
            const firstName = user.first_name?.toLowerCase() || "";
            const lastName = user.last_name?.toLowerCase() || "";
            const email = user.email?.toLowerCase() || "";
            return (
                firstName.includes(query) ||
                lastName.includes(query) ||
                email.includes(query)
            );
        });
    }, [allUsers, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-panel-border bg-panel-card p-6 shadow-xl">
                <h3 className="mb-2 text-xl font-bold text-panel-text">
                    Asignar Usuarios
                </h3>
                <p className="mb-4 text-sm text-panel-muted">
                    Selecciona los usuarios para asignar a {coachName}
                </p>

                <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-4 w-full rounded-lg border border-panel-border bg-panel-bg px-4 py-2 text-sm text-panel-text outline-none transition focus:border-panel-primary"
                />

                <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
                    {filteredUsers.length === 0 ? (
                        <p className="text-sm text-panel-muted py-4 text-center">
                            No hay usuarios disponibles
                        </p>
                    ) : (
                        filteredUsers.map((user) => (
                            <label
                                key={user.user_id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:bg-panel-bg/50 cursor-pointer transition"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.user_id)}
                                    onChange={() => handleToggleUser(user.user_id)}
                                    className="size-4 rounded border-panel-border bg-panel-bg text-panel-primary accent-panel-primary focus:ring-panel-primary"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-sm font-medium text-panel-text block truncate">
                                        {user.first_name} {user.last_name}
                                    </span>
                                    <span className="text-xs text-panel-muted block truncate">
                                        {user.email}
                                    </span>
                                </div>
                            </label>
                        ))
                    )}
                </div>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
                        {error}
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 rounded-lg border border-panel-border px-4 py-2 text-sm font-semibold text-panel-muted transition hover:bg-panel-bg disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-panel-text-light transition hover:opacity-90 disabled:opacity-50"
                    >
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function AdminCoachesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [currentProfile, setCurrentProfile] = useState<FirestoreUser | null>(null);
    const [coaches, setCoaches] = useState<FirestoreUser[]>([]);
    const [allUsers, setAllUsers] = useState<FirestoreUser[]>([]);
    const [coachUserCounts, setCoachUserCounts] = useState<Record<string, number>>({});
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Selected coach for detail view
    const [selectedCoach, setSelectedCoach] = useState<FirestoreUser | null>(null);
    const [coachUsers, setCoachUsers] = useState<FirestoreUser[]>([]);
    const [loadingCoachUsers, setLoadingCoachUsers] = useState(false);

    // Color picker state
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

    // User assignment modal
    const [userAssignmentModal, setUserAssignmentModal] = useState<{
        isOpen: boolean;
        coachId: string | null;
        currentUserIds: string[];
        coachName: string;
    }>({
        isOpen: false,
        coachId: null,
        currentUserIds: [],
        coachName: "",
    });

    const loadCoachUsers = useCallback(async (coachId: string) => {
        setLoadingCoachUsers(true);
        try {
            const users = await getUsersByCoach(coachId);
            setCoachUsers(users);
        } catch (err) {
            console.error("Error loading coach users:", err);
        } finally {
            setLoadingCoachUsers(false);
        }
    }, []);

    const handleSelectCoach = useCallback(
        async (coach: FirestoreUser) => {
            setSelectedCoach(coach);
            setIsColorPickerOpen(false);
            await loadCoachUsers(coach.user_id);
        },
        [loadCoachUsers]
    );

    const handleOpenUserAssignment = useCallback(() => {
        if (!selectedCoach) return;
        setUserAssignmentModal({
            isOpen: true,
            coachId: selectedCoach.user_id,
            currentUserIds: coachUsers.map((u) => u.user_id),
            coachName: `${selectedCoach.first_name} ${selectedCoach.last_name}`,
        });
    }, [selectedCoach, coachUsers]);

    const closeUserAssignmentModal = useCallback(() => {
        setUserAssignmentModal({
            isOpen: false,
            coachId: null,
            currentUserIds: [],
            coachName: "",
        });
    }, []);

    const handleSaveUserAssignment = useCallback(
        async (userIds: string[]) => {
            if (!userAssignmentModal.coachId) return;
            const coachId = userAssignmentModal.coachId;

            try {
                // Get current users assigned to this coach
                const currentUsers = await getUsersByCoach(coachId);
                const currentUserIds = currentUsers.map((u) => u.user_id);

                // Determine which users to add and which to remove
                const usersToAdd = userIds.filter((id) => !currentUserIds.includes(id));
                const usersToRemove = currentUserIds.filter((id) => !userIds.includes(id));

                // Update each user's assignedCoaches array
                for (const userId of usersToAdd) {
                    const user = allUsers.find((u) => u.user_id === userId);
                    if (user) {
                        const newCoaches = [...(user.assignedCoaches || []), coachId];
                        await updateUserCoaches(userId, newCoaches);
                    }
                }

                for (const userId of usersToRemove) {
                    const user = allUsers.find((u) => u.user_id === userId);
                    if (user) {
                        const newCoaches = (user.assignedCoaches || []).filter(
                            (id) => id !== coachId
                        );
                        await updateUserCoaches(userId, newCoaches);
                    }
                }

                // Refresh data
                const updatedUsers = await getAllUsers();
                setAllUsers(updatedUsers);

                // Refresh coach users if viewing a coach
                if (selectedCoach) {
                    await loadCoachUsers(selectedCoach.user_id);
                }

                // Refresh coach user counts
                const counts: Record<string, number> = {};
                for (const coach of coaches) {
                    counts[coach.user_id] = updatedUsers.filter(
                        (u) => u.assignedCoaches?.includes(coach.user_id)
                    ).length;
                }
                setCoachUserCounts(counts);
            } catch (err) {
                console.error("Error saving user assignments:", err);
                throw err;
            }
        },
        [
            userAssignmentModal.coachId,
            allUsers,
            selectedCoach,
            coaches,
            loadCoachUsers,
        ]
    );

    const handleRemoveUser = useCallback(
        async (userId: string) => {
            if (!selectedCoach) return;

            try {
                const user = allUsers.find((u) => u.user_id === userId);
                if (user) {
                    const newCoaches = (user.assignedCoaches || []).filter(
                        (id) => id !== selectedCoach.user_id
                    );
                    await updateUserCoaches(userId, newCoaches);

                    // Refresh
                    const updatedUsers = await getAllUsers();
                    setAllUsers(updatedUsers);
                    await loadCoachUsers(selectedCoach.user_id);

                    // Update count
                    setCoachUserCounts((prev) => ({
                        ...prev,
                        [selectedCoach.user_id]: (prev[selectedCoach.user_id] || 1) - 1,
                    }));
                }
            } catch (err) {
                console.error("Error removing user:", err);
            }
        },
        [selectedCoach, allUsers, loadCoachUsers]
    );

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push("/");
            return;
        }

        let isMounted = true;

        const initialise = async () => {
            try {
                const profile = await getUserProfile(user.uid);

                if (!profile || !profile.is_admin) {
                    router.push("/");
                    return;
                }

                if (isMounted) {
                    setCurrentProfile(profile);
                }

                // Load coaches and all users
                const [coachList, userList] = await Promise.all([
                    getCoachUsers(),
                    getAllUsers(),
                ]);

                if (!isMounted) return;

                setCoaches(coachList);
                setAllUsers(userList);

                // Calculate user counts per coach
                const counts: Record<string, number> = {};
                for (const coach of coachList) {
                    counts[coach.user_id] = userList.filter(
                        (u) => u.assignedCoaches?.includes(coach.user_id)
                    ).length;
                }
                setCoachUserCounts(counts);

                setPageLoading(false);
            } catch (err) {
                console.error("Error loading admin coaches data:", err);
                if (isMounted) {
                    setError("Unable to load coaches. Please try again.");
                    setPageLoading(false);
                }
            }
        };

        initialise();

        return () => {
            isMounted = false;
        };
    }, [user, loading, router]);

    if (loading || pageLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-panel-primary border-t-transparent" />
                    <p className="text-panel-muted">Cargando...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-panel-text-light"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-8">
            <UserAssignmentModal
                isOpen={userAssignmentModal.isOpen}
                onClose={closeUserAssignmentModal}
                onSave={handleSaveUserAssignment}
                allUsers={allUsers}
                currentUsers={userAssignmentModal.currentUserIds}
                coachName={userAssignmentModal.coachName}
            />

            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-panel-text">Admin Coaches</h1>
                        <p className="text-sm text-panel-muted">
                            Gestiona los coaches y sus usuarios asignados
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-panel-primary">
                            {coaches.length}
                        </span>
                        <span className="text-sm text-panel-muted ml-2">
                            {coaches.length === 1 ? "Coach" : "Coaches"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coaches List */}
                    <div className="lg:col-span-1">
                        <div className="rounded-2xl border border-panel-border bg-panel-card shadow-sm">
                            <div className="border-b border-panel-border p-4">
                                <h2 className="text-lg font-semibold text-panel-text">
                                    Lista de Coaches
                                </h2>
                            </div>
                            <div className="p-4 space-y-2">
                                {coaches.length === 0 ? (
                                    <p className="text-sm text-panel-muted text-center py-8">
                                        No hay coaches registrados
                                    </p>
                                ) : (
                                    coaches.map((coach) => (
                                        <button
                                            key={coach.user_id}
                                            onClick={() => handleSelectCoach(coach)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition ${selectedCoach?.user_id === coach.user_id
                                                ? "border-panel-primary bg-panel-primary/10"
                                                : "border-panel-border hover:bg-panel-bg/50"
                                                }`}
                                        >
                                            <div className={`flex size-10 items-center justify-center rounded-full text-sm font-semibold ${coach.color ? `${coach.color} text-white` : "bg-panel-primary/15 text-panel-primary"}`}>
                                                {getInitials(coach.first_name, coach.last_name, coach.email)}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-medium text-panel-text truncate">
                                                    {coach.first_name} {coach.last_name}
                                                </p>
                                                <p className="text-xs text-panel-muted truncate">
                                                    {coachUserCounts[coach.user_id] || 0} usuarios
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Coach Detail */}
                    <div className="lg:col-span-2">
                        <div className="rounded-2xl border border-panel-border bg-panel-card shadow-sm">
                            {selectedCoach ? (
                                <>
                                    <div className="border-b border-panel-border p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`flex size-12 items-center justify-center rounded-full text-lg font-semibold ${selectedCoach.color ? `${selectedCoach.color} text-white` : "bg-panel-primary/15 text-panel-primary"
                                                    }`}
                                            >
                                                {getInitials(
                                                    selectedCoach.first_name,
                                                    selectedCoach.last_name,
                                                    selectedCoach.email
                                                )}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-panel-text">
                                                    {selectedCoach.first_name} {selectedCoach.last_name}
                                                </h2>
                                                <p className="text-sm text-panel-muted">
                                                    {selectedCoach.email}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Color Picker */}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                                    className="flex items-center gap-2 rounded-lg border border-panel-border bg-panel-bg px-3 py-2 text-sm font-medium text-panel-text transition hover:bg-panel-border/50"
                                                >
                                                    <div className={`size-4 rounded-full ${selectedCoach.color || "bg-panel-primary"}`}></div>
                                                    <span>Color</span>
                                                </button>
                                                {isColorPickerOpen && (
                                                    <div className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-panel-border bg-panel-card p-3 shadow-lg">
                                                        <div className="grid grid-cols-6 gap-2">
                                                            {[
                                                                "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500", "bg-lime-500", "bg-green-500",
                                                                "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
                                                                "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500", "bg-slate-500",
                                                                "bg-gray-500", "bg-zinc-500", "bg-neutral-500", "bg-stone-500", "bg-red-400", "bg-blue-400"
                                                            ].map((color) => (
                                                                <button
                                                                    key={color}
                                                                    className={`size-6 rounded-full ${color} hover:scale-110 transition`}
                                                                    onClick={async () => {
                                                                        // Update coach color
                                                                        try {
                                                                            const { updateUserField } = await import("@/lib/firestore-helpers");
                                                                            await updateUserField(selectedCoach.user_id, "color", color);
                                                                            // Update local state
                                                                            setSelectedCoach({ ...selectedCoach, color });
                                                                            setCoaches(prev => prev.map(c => c.user_id === selectedCoach.user_id ? { ...c, color } : c));
                                                                            setIsColorPickerOpen(false);
                                                                        } catch (err) {
                                                                            console.error("Error updating color:", err);
                                                                            alert("Error al actualizar el color. Intenta de nuevo.");
                                                                        }
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                onClick={handleOpenUserAssignment}
                                                className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-panel-text-light transition hover:opacity-90"
                                            >
                                                Asignar Usuarios
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="text-sm font-semibold text-panel-muted uppercase tracking-wider mb-4">
                                            Usuarios Asignados ({coachUsers.length})
                                        </h3>
                                        {loadingCoachUsers ? (
                                            <div className="flex items-center justify-center py-8">
                                                <div className="size-6 animate-spin rounded-full border-2 border-panel-primary border-t-transparent" />
                                            </div>
                                        ) : coachUsers.length === 0 ? (
                                            <p className="text-sm text-panel-muted text-center py-8">
                                                No hay usuarios asignados a este coach
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {coachUsers.map((user) => (
                                                    <div
                                                        key={user.user_id}
                                                        className="flex items-center gap-3 p-3 rounded-xl border border-panel-border"
                                                    >
                                                        <div className="flex size-10 items-center justify-center rounded-full bg-panel-bg text-sm font-semibold text-panel-muted">
                                                            {getInitials(
                                                                user.first_name,
                                                                user.last_name,
                                                                user.email
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-panel-text truncate">
                                                                {user.first_name} {user.last_name}
                                                            </p>
                                                            <p className="text-xs text-panel-muted truncate">
                                                                {user.email}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveUser(user.user_id)}
                                                            className="text-xs text-red-500 font-semibold hover:bg-red-500/10 px-3 py-1 rounded transition"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center">
                                    <span className="material-symbols-outlined text-4xl text-panel-muted mb-4">
                                        sports
                                    </span>
                                    <p className="text-sm text-panel-muted">
                                        Selecciona un coach para ver sus usuarios asignados
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
