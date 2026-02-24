"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAllUsers,
  getUserProfile,
  updateUserField,
  updateUserEmail,
  updateUserType,
  getCoachUsers,
  updateUserCoaches
} from "@/lib/firestore-helpers";
import type { User as FirestoreUser, UserType } from "@/lib/firestore-schema";
import { updatePassword, updateEmail as updateAuthEmail, getIdToken } from "firebase/auth";

const PASSWORD_PLACEHOLDER = "********";

type ProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: FirestoreUser | null;
  onEdit?: (field: EditableField, userId: string, currentValue: string | number | undefined) => void;
  onOpenCoachAssignment?: (userId: string, currentCoaches: string[]) => void;
  onToggleCoach?: (userId: string, currentValue: boolean) => void;
  coaches?: FirestoreUser[];
};

function ProfileModal({ isOpen, onClose, user, onEdit, onOpenCoachAssignment, onToggleCoach, coaches }: ProfileModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-2xl border border-panel-border bg-panel-card shadow-xl">
        <div className="flex items-center justify-between border-b border-panel-border p-4">
          <h3 className="text-lg font-bold text-panel-text">Perfil de Usuario</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-panel-muted transition hover:bg-panel-bg"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
        <div className="p-6">
          <UserCard user={user} onEdit={onEdit} onOpenCoachAssignment={onOpenCoachAssignment} onToggleCoach={onToggleCoach} coaches={coaches} />
        </div>
      </div>
    </div>
  );
}

type EditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => Promise<void>;
  title: string;
  label: string;
  currentValue: string;
  inputType?: "text" | "number" | "email" | "password";
  placeholder?: string;
};

function EditModal({
  isOpen,
  onClose,
  onSave,
  title,
  label,
  currentValue,
  inputType = "text",
  placeholder
}: EditModalProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(currentValue);
      setError(null);
    }
  }, [currentValue, isOpen, onClose, onSave]);

  const handleSave = async () => {
    if (!value.trim() && inputType !== "number") {
      setError("Este campo no puede estar vacío");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(value);
      onClose();
    } catch (err) {
      console.error("Error saving:", err);
      setError(err instanceof Error ? err.message : "Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-panel-border bg-panel-card p-6 shadow-xl">
        <h3 className="mb-4 text-xl font-bold text-panel-text">{title}</h3>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-panel-muted">{label}</label>
          <input
            type={inputType}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-panel-border bg-panel-bg px-4 py-2 text-panel-text outline-none transition focus:border-panel-primary"
            disabled={saving}
          />
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

type CoachAssignmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (coachIds: string[]) => Promise<void>;
  coaches: FirestoreUser[];
  currentCoaches: string[];
  userName: string;
};

function CoachAssignmentModal({
  isOpen,
  onClose,
  onSave,
  coaches,
  currentCoaches,
  userName
}: CoachAssignmentModalProps) {
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>(currentCoaches);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedCoaches(currentCoaches);
      setError(null);
    }
  }, [currentCoaches, isOpen]);

  const handleToggleCoach = (coachId: string) => {
    setSelectedCoaches(prev =>
      prev.includes(coachId)
        ? prev.filter(id => id !== coachId)
        : [...prev, coachId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(selectedCoaches);
      onClose();
    } catch (err) {
      console.error("Error saving coaches:", err);
      setError(err instanceof Error ? err.message : "Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-panel-border bg-panel-card p-6 shadow-xl">
        <h3 className="mb-2 text-xl font-bold text-panel-text">Asignar Coaches</h3>
        <p className="mb-4 text-sm text-panel-muted">Selecciona los coaches para {userName}</p>

        <div className="max-h-64 overflow-y-auto mb-4 space-y-2">
          {coaches.length === 0 ? (
            <p className="text-sm text-panel-muted py-4 text-center">No hay coaches disponibles</p>
          ) : (
            coaches.map(coach => (
              <label
                key={coach.user_id}
                className="flex items-center gap-3 p-3 rounded-lg border border-panel-border hover:bg-panel-bg/50 cursor-pointer transition"
              >
                <input
                  type="checkbox"
                  checked={selectedCoaches.includes(coach.user_id)}
                  onChange={() => handleToggleCoach(coach.user_id)}
                  className="size-4 rounded border-panel-border bg-panel-bg text-panel-primary accent-panel-primary focus:ring-panel-primary"
                />
                <div>
                  <span className="text-sm font-medium text-panel-text">
                    {coach.first_name} {coach.last_name}
                  </span>
                  <span className="block text-xs text-panel-muted">{coach.email}</span>
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

type DetailRowProps = {
  label: string;
  value: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
};

function DetailRow({ label, value, actionLabel, onAction }: DetailRowProps) {
  return (
    <div className="grid grid-cols-1 gap-y-2 border-t border-panel-border px-4 py-4 md:grid-cols-[160px_1fr_auto] md:items-center">
      <span className="text-sm font-medium text-panel-muted">{label}</span>
      <div className="text-sm text-panel-text">{value}</div>
      {actionLabel ? (
        <div className="flex justify-start md:justify-end">
          <button
            onClick={onAction}
            className="rounded-lg px-3 py-1 text-sm font-semibold text-panel-primary transition hover:bg-panel-primary/10"
          >
            {actionLabel}
          </button>
        </div>
      ) : (
        <div className="hidden md:block" aria-hidden="true" />
      )}
    </div>
  );
}

type EditableField = "email" | "password" | "first_name" | "last_name" | "age" | "weight";

function formatUserType(userType: FirestoreUser["user_type"]): string {
  if (!userType) {
    return "No seleccionado";
  }

  switch (userType) {
    case "base":
      return "Base";
    case "kiconu":
      return "Kiconu";
    case "premium":
      return "Premium";
    case "admin":
      return "Admin";
    case "inactive":
      return "Inactivo";
    default:
      return userType;
  }
}

function formatGender(gender: FirestoreUser["gender"]): string {
  if (!gender) {
    return "No proporcionado";
  }

  return gender
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatWeight(weight: FirestoreUser["weight"]): string {
  if (weight === undefined || weight === null) {
    return "No proporcionado";
  }

  return `${weight} kg`;
}

function formatAge(age: FirestoreUser["age"]): string {
  if (age === undefined || age === null) {
    return "No proporcionado";
  }

  return `${age} años`;
}

function formatDate(date: FirestoreUser["registration_date"]): string {
  if (!date) {
    return "No disponible";
  }

  try {
    return new Intl.DateTimeFormat("es", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date instanceof Date ? date : new Date(date));
  } catch (error) {
    return "No disponible";
  }
}

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

interface UserCardProps {
  user: FirestoreUser;
  editHandlers?: Partial<Record<EditableField, () => void>>;
  onEdit?: (field: EditableField, userId: string, currentValue: string | number | undefined) => void;
  onOpenCoachAssignment?: (userId: string, currentCoaches: string[]) => void;
  onToggleCoach?: (userId: string, currentValue: boolean) => void;
  coaches?: FirestoreUser[];
}

function UserCard({ user, editHandlers, onEdit, onOpenCoachAssignment, onToggleCoach, coaches }: UserCardProps) {
  // Generate edit handlers from onEdit callback if not provided directly
  const handlers = editHandlers || (onEdit ? {
    email: () => onEdit("email", user.user_id, user.email),
    password: () => onEdit("password", user.user_id, ""),
    first_name: () => onEdit("first_name", user.user_id, user.first_name),
    last_name: () => onEdit("last_name", user.user_id, user.last_name),
    age: () => onEdit("age", user.user_id, user.age),
    weight: () => onEdit("weight", user.user_id, user.weight),
  } : undefined);
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "Name unavailable";
  const initials = getInitials(user.first_name, user.last_name, user.email);

  return (
    <article className="rounded-2xl border border-panel-border bg-panel-card shadow-lg">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-panel-primary/15 text-xl font-semibold text-panel-primary">
              {initials}
            </div>
            <div>
              <p className="text-xl font-semibold text-panel-text">{fullName}</p>
              <p className="text-sm text-panel-muted">{user.email}</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <span className="inline-flex items-center justify-center rounded-full bg-panel-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-panel-primary">
              {formatUserType(user.user_type)}
            </span>
            {user.is_admin && (
              <span className="inline-flex items-center justify-center rounded-full border border-panel-primary/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-panel-primary">
                Admin Access
              </span>
            )}
            <span className="text-xs text-panel-muted">
              Se unió {formatDate(user.registration_date)}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-panel-border bg-panel-bg/60">
          <DetailRow
            label="Email"
            value={user.email || "No proporcionado"}
            actionLabel={handlers?.email ? "Editar" : undefined}
            onAction={handlers?.email}
          />
          <DetailRow
            label="Contraseña"
            value={
              <div className="flex flex-col">
                <span className="font-semibold tracking-[0.4em] text-panel-text/80">{PASSWORD_PLACEHOLDER}</span>
              </div>
            }
            actionLabel={handlers?.password ? "Editar" : undefined}
            onAction={handlers?.password}
          />

          {/* Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-panel-border">
            <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-panel-border">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-xs font-medium text-panel-muted">Nombre</span>
                  <span className="text-sm text-panel-text">{user.first_name || "No proporcionado"}</span>
                </div>
                {handlers?.first_name && (
                  <button onClick={handlers.first_name} className="text-xs text-panel-primary font-semibold hover:bg-panel-primary/10 px-2 py-1 rounded">Editar</button>
                )}
              </div>
            </div>
            <div className="px-4 py-2">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-xs font-medium text-panel-muted">Apellido</span>
                  <span className="text-sm text-panel-text">{user.last_name || "No proporcionado"}</span>
                </div>
                {handlers?.last_name && (
                  <button onClick={handlers.last_name} className="text-xs text-panel-primary font-semibold hover:bg-panel-primary/10 px-2 py-1 rounded">Editar</button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-panel-border">
            <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-panel-border">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-xs font-medium text-panel-muted">Edad</span>
                  <span className="text-sm text-panel-text">{formatAge(user.age)}</span>
                </div>
                {handlers?.age && (
                  <button onClick={handlers.age} className="text-xs text-panel-primary font-semibold hover:bg-panel-primary/10 px-2 py-1 rounded">Editar</button>
                )}
              </div>
            </div>
            <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-panel-border">
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-xs font-medium text-panel-muted">Peso</span>
                  <span className="text-sm text-panel-text">{formatWeight(user.weight)}</span>
                </div>
                {handlers?.weight && (
                  <button onClick={handlers.weight} className="text-xs text-panel-primary font-semibold hover:bg-panel-primary/10 px-2 py-1 rounded">Editar</button>
                )}
              </div>
            </div>
            <div className="px-4 py-2">
              <div>
                <span className="block text-xs font-medium text-panel-muted">Género</span>
                <span className="text-sm text-panel-text">{formatGender(user.gender)}</span>
              </div>
            </div>
          </div>

          {/* Roles Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 border-t border-panel-border">
            <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-panel-border flex items-center justify-between">
              <div>
                <span className="block text-xs font-medium text-panel-muted">Tipo Usuario</span>
                <span className="text-sm text-panel-text">{formatUserType(user.user_type)}</span>
              </div>
            </div>
            <div className="px-4 py-2 border-b md:border-b-0 md:border-r border-panel-border">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-medium text-panel-muted">Coaches Asignados</span>
                  <span className="text-sm text-panel-text">
                    {user.assignedCoaches && user.assignedCoaches.length > 0
                      ? coaches?.filter(c => user.assignedCoaches?.includes(c.user_id)).map(c => `${c.first_name} ${c.last_name}`).join(", ") || `${user.assignedCoaches.length} coach(es)`
                      : "Sin coach"}
                  </span>
                </div>
                {onOpenCoachAssignment && (
                  <button
                    onClick={() => onOpenCoachAssignment(user.user_id, user.assignedCoaches || [])}
                    className="text-xs text-panel-primary font-semibold hover:bg-panel-primary/10 px-2 py-1 rounded"
                  >
                    Asignar
                  </button>
                )}
              </div>
            </div>
            <div className="px-4 py-2 flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!user.isCoach}
                onChange={() => onToggleCoach?.(user.user_id, !!user.isCoach)}
                className="size-4 rounded border-panel-border bg-panel-bg text-panel-primary accent-panel-primary focus:ring-panel-primary"
              />
              <span className="text-sm text-panel-text">Es Coach</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentProfile, setCurrentProfile] = useState<FirestoreUser | null>(null);
  const [missingUserType, setMissingUserType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [directoryUsers, setDirectoryUsers] = useState<FirestoreUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // Profile modal state
  const [profileModal, setProfileModal] = useState<{
    isOpen: boolean;
    user: FirestoreUser | null;
  }>({
    isOpen: false,
    user: null,
  });

  // Collapsible profile section state - open by default for non-admin users
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Show inactive users toggle
  const [showInactive, setShowInactive] = useState(false);

  // Coaches list
  const [coaches, setCoaches] = useState<FirestoreUser[]>([]);

  // Coach assignment modal state
  const [coachAssignmentModal, setCoachAssignmentModal] = useState<{
    isOpen: boolean;
    userId: string | null;
    currentCoaches: string[];
    userName: string;
  }>({
    isOpen: false,
    userId: null,
    currentCoaches: [],
    userName: "",
  });

  // Edit modal state
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    field: EditableField | null;
    userId: string | null;
    currentValue: string;
    title: string;
    label: string;
    inputType: "text" | "number" | "email" | "password";
  }>({
    isOpen: false,
    field: null,
    userId: null,
    currentValue: "",
    title: "",
    label: "",
    inputType: "text",
  });

  const openEditModal = useCallback((
    field: EditableField,
    userId: string,
    currentValue: string | number | undefined,
    isCurrentUser: boolean
  ) => {
    const fieldConfig: Record<EditableField, { title: string; label: string; inputType: "text" | "number" | "email" | "password" }> = {
      email: { title: "Editar Email", label: "Email", inputType: "email" },
      password: { title: "Cambiar Contraseña", label: "Nueva Contraseña", inputType: "password" },
      first_name: { title: "Editar Nombre", label: "Nombre", inputType: "text" },
      last_name: { title: "Editar Apellido", label: "Apellido", inputType: "text" },
      age: { title: "Editar Edad", label: "Edad (años)", inputType: "number" },
      weight: { title: "Editar Peso", label: "Peso (kg)", inputType: "number" },
    };

    const config = fieldConfig[field];

    setEditModal({
      isOpen: true,
      field,
      userId,
      currentValue: field === "password" ? "" : String(currentValue ?? ""),
      title: config.title,
      label: config.label,
      inputType: config.inputType,
    });
  }, []);

  const closeEditModal = useCallback(() => {
    setEditModal({
      isOpen: false,
      field: null,
      userId: null,
      currentValue: "",
      title: "",
      label: "",
      inputType: "text",
    });
  }, []);

  const handleSaveEdit = useCallback(async (value: string) => {
    if (!editModal.field || !editModal.userId) return;

    const { field, userId } = editModal;

    try {
      if (field === "email") {
        // Update email in Firestore
        await updateUserEmail(userId, value);

        // If editing current user's email, also update Firebase Auth
        if (user && userId === user.uid) {
          await updateAuthEmail(user, value);
        }
      } else if (field === "password") {
        // Password change logic
        if (user && userId === user.uid) {
          // Changed by the user themselves
          await updatePassword(user, value);
        } else {
          // Changed by admin for another user
          if (!user) throw new Error("No authenticated user found");

          const token = await getIdToken(user);
          const response = await fetch("/api/admin/change-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              userId,
              newPassword: value,
              adminUid: user.uid
            })
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Error updating password");
          }
        }
      } else if (field === "age" || field === "weight") {
        // Numeric fields
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error("Por favor ingresa un número válido");
        }
        await updateUserField(userId, field, numValue);
      } else {
        // Text fields (first_name, last_name)
        await updateUserField(userId, field, value);
      }

      // Refresh data
      if (userId !== user?.uid) {
        // Refresh all users if editing someone else
        const updatedUsers = await getAllUsers();
        const sortedUsers = updatedUsers
          .filter((entry) => entry.user_id !== user?.uid)
          .sort((a, b) => {
            const aTime = a.registration_date instanceof Date ? a.registration_date.getTime() : 0;
            const bTime = b.registration_date instanceof Date ? b.registration_date.getTime() : 0;
            return bTime - aTime;
          });
        setDirectoryUsers(sortedUsers);
      }

      // If profile modal is open for this user, refresh the modal data
      await refreshUserDetails(userId);
    } catch (error) {
      console.error("Error saving field:", error);
      throw error;
    }
  }, [editModal.field, editModal.userId, user, profileModal.isOpen, profileModal.user?.user_id]);

  const handleEditField = useCallback((field: EditableField, userId: string, currentValue: string | number | undefined) => {
    const isCurrentUser = userId === user?.uid;
    openEditModal(field, userId, currentValue, isCurrentUser);
  }, [user?.uid, openEditModal]);

  const openProfileModal = useCallback((user: FirestoreUser) => {
    setProfileModal({
      isOpen: true,
      user,
    });
  }, []);

  const closeProfileModal = useCallback(() => {
    setProfileModal({
      isOpen: false,
      user: null,
    });
  }, []);

  const navigateToCoaching = useCallback((userId: string) => {
    router.push(`/coaching/${userId}`);
  }, [router]);

  const refreshDirectoryUsers = useCallback(async () => {
    const updatedUsers = await getAllUsers();
    const sortedUsers = updatedUsers
      .filter((entry) => entry.user_id !== user?.uid)
      .sort((a, b) => {
        const aTime = a.registration_date instanceof Date ? a.registration_date.getTime() : 0;
        const bTime = b.registration_date instanceof Date ? b.registration_date.getTime() : 0;
        return bTime - aTime;
      });
    setDirectoryUsers(sortedUsers);
  }, [user?.uid]);

  const refreshUserDetails = useCallback(async (userId: string) => {
    if (profileModal.isOpen && profileModal.user?.user_id === userId) {
      const updatedUser = await getUserProfile(userId);
      setProfileModal({
        isOpen: true,
        user: updatedUser,
      });
    }
  }, [profileModal.isOpen, profileModal.user?.user_id]);

  const handleUserTypeChange = useCallback(async (userId: string, newUserType: UserType) => {
    try {
      await updateUserType(userId, newUserType);
      await refreshDirectoryUsers();
      await refreshUserDetails(userId);

      // Update the profile modal if it's open
      if (profileModal.isOpen && profileModal.user?.user_id === userId) {
        const updatedUser = await getUserProfile(userId);
        setProfileModal({
          isOpen: true,
          user: updatedUser,
        });
      }
    } catch (error) {
      console.error("Error updating user type:", error);
      throw error;
    }
  }, [user?.uid, profileModal.isOpen, profileModal.user?.user_id]);

  const handleOpenCoachAssignment = useCallback((userId: string, currentCoaches: string[]) => {
    const targetUser = directoryUsers.find(u => u.user_id === userId) || profileModal.user;
    const userName = targetUser ? `${targetUser.first_name} ${targetUser.last_name}` : "Usuario";
    setCoachAssignmentModal({
      isOpen: true,
      userId,
      currentCoaches,
      userName,
    });
  }, [directoryUsers, profileModal.user]);

  const closeCoachAssignmentModal = useCallback(() => {
    setCoachAssignmentModal({
      isOpen: false,
      userId: null,
      currentCoaches: [],
      userName: "",
    });
  }, []);

  const handleSaveCoachAssignment = useCallback(async (coachIds: string[]) => {
    if (!coachAssignmentModal.userId) return;

    try {
      await updateUserCoaches(coachAssignmentModal.userId, coachIds);
      await refreshDirectoryUsers();
      await refreshUserDetails(coachAssignmentModal.userId);

      // Refresh coaches list as well
      const updatedCoaches = await getCoachUsers();
      setCoaches(updatedCoaches);
    } catch (error) {
      console.error("Error saving coach assignment:", error);
      throw error;
    }
  }, [coachAssignmentModal.userId, refreshDirectoryUsers, refreshUserDetails]);

  const handleToggleCoach = useCallback(async (userId: string, currentValue: boolean) => {
    try {
      await updateUserField(userId, "isCoach", !currentValue);
      await refreshDirectoryUsers();
      await refreshUserDetails(userId);

      // Update the profile modal if it's open
      if (profileModal.isOpen && profileModal.user?.user_id === userId) {
        const updatedUser = await getUserProfile(userId);
        setProfileModal({
          isOpen: true,
          user: updatedUser,
        });
      }
    } catch (error) {
      console.error("Error toggling coach status:", error);
      throw error;
    }
  }, [profileModal.isOpen, profileModal.user?.user_id, refreshDirectoryUsers, refreshUserDetails]);

  const profileEditHandlers = useMemo<Partial<Record<EditableField, () => void>>>(() => {
    if (!currentProfile) return {};

    return {
      email: () => handleEditField("email", currentProfile.user_id, currentProfile.email),
      password: () => handleEditField("password", currentProfile.user_id, ""),
      first_name: () => handleEditField("first_name", currentProfile.user_id, currentProfile.first_name),
      last_name: () => handleEditField("last_name", currentProfile.user_id, currentProfile.last_name),
      age: () => handleEditField("age", currentProfile.user_id, currentProfile.age),
      weight: () => handleEditField("weight", currentProfile.user_id, currentProfile.weight),
    };
  }, [handleEditField, currentProfile]);

  // Filter users based on search query and inactive toggle
  const filteredUsers = useMemo(() => {
    let users = directoryUsers;

    // Filter out inactive users unless toggle is on
    if (!showInactive) {
      users = users.filter((user) => user.user_type !== "inactive");
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      users = users.filter((user) => {
        const firstName = user.first_name?.toLowerCase() || "";
        const lastName = user.last_name?.toLowerCase() || "";
        const email = user.email?.toLowerCase() || "";
        return firstName.includes(query) || lastName.includes(query) || email.includes(query);
      });
    }

    return users;
  }, [directoryUsers, searchQuery, showInactive]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.push("/");
      return;
    }

    let isMounted = true;

    const initialise = async () => {
      try {
        const profile = await getUserProfile(user.uid);

        if (!profile) {
          router.push("/");
          return;
        }

        const hasAssignedUserType = typeof profile.user_type === "string" && profile.user_type.length > 0;

        if (!hasAssignedUserType) {
          if (isMounted) {
            setCurrentProfile(profile);
            setMissingUserType(true);
            setUsersLoading(false);
          }
          return;
        }

        if (!isMounted) {
          return;
        }

        setMissingUserType(false);
        setCurrentProfile(profile);

        setMissingUserType(false);
        setCurrentProfile(profile);

        // Always admin if we are here (guarded by AuthGuard ideally, but double check)
        if (profile.is_admin) {
          const fetchedUsers = await getAllUsers();

          if (!isMounted) {
            return;
          }

          // Sort newest first to surface the latest registrations
          const sortedUsers = fetchedUsers
            .filter((entry) => entry.user_id !== profile.user_id)
            .sort((a, b) => {
              const aTime = a.registration_date instanceof Date ? a.registration_date.getTime() : 0;
              const bTime = b.registration_date instanceof Date ? b.registration_date.getTime() : 0;
              return bTime - aTime;
            });

          setDirectoryUsers(sortedUsers);

          // Load coaches
          const coachUsers = await getCoachUsers();
          if (isMounted) {
            setCoaches(coachUsers);
          }
        }

        if (isMounted) {
          setUsersLoading(false);
        }
      } catch (err) {
        console.error("Error loading admin data:", err);
        if (isMounted) {
          setError("Unable to load users. Please try again.");
          setUsersLoading(false);
        }
      }
    };

    initialise();

    return () => {
      isMounted = false;
    };
  }, [user, loading, router]);

  if (loading || usersLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center ">
        <div className="text-center">
          <div className="mb-4 inline-block size-12 animate-spin rounded-full border-4 border-panel-primary border-t-transparent"></div>
          <p className="text-sm text-panel-muted">Cargando panel de administración…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl border border-panel-border bg-panel-card p-8 text-center shadow-lg">
          <p className="mb-2 text-lg font-semibold text-panel-text">Algo salió mal</p>
          <p className="text-sm text-panel-muted">{error}</p>
        </div>
      </div>
    );
  }

  if (missingUserType) {
    return (
      <div className="flex min-h-screen items-center justify-center ">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-panel-border bg-panel-card p-8 text-center shadow-lg">
          <p className="text-lg font-semibold text-panel-text">Termina de seleccionar tu plan</p>
          <p className="max-w-sm text-sm text-panel-muted">
            Elige un plan de suscripción para desbloquear tu experiencia de panel, luego regresa a esta página para revisar los detalles de tu perfil.
          </p>
          <button
            onClick={() => router.push("/payment")}
            className="rounded-xl bg-panel-primary px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-panel-text-light transition hover:opacity-90"
          >
            Ir a planes
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = Boolean(currentProfile?.is_admin);
  const adminFullName = currentProfile
    ? [currentProfile.first_name, currentProfile.last_name].filter(Boolean).join(" ")
    : "User";
  const userTypeLabel = formatUserType(currentProfile?.user_type ?? null);
  const totalUsersCount = isAdmin ? directoryUsers.length + 1 : 1;

  return (
    <div className="min-h-screen  py-8">
      <ProfileModal
        isOpen={profileModal.isOpen}
        onClose={closeProfileModal}
        user={profileModal.user}
        onEdit={handleEditField}
        onOpenCoachAssignment={handleOpenCoachAssignment}
        onToggleCoach={handleToggleCoach}
        coaches={coaches}
      />

      <CoachAssignmentModal
        isOpen={coachAssignmentModal.isOpen}
        onClose={closeCoachAssignmentModal}
        onSave={handleSaveCoachAssignment}
        coaches={coaches}
        currentCoaches={coachAssignmentModal.currentCoaches}
        userName={coachAssignmentModal.userName}
      />

      <EditModal
        isOpen={editModal.isOpen}
        onClose={closeEditModal}
        onSave={handleSaveEdit}
        title={editModal.title}
        label={editModal.label}
        currentValue={editModal.currentValue}
        inputType={editModal.inputType}
      />

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4">
        {isAdmin && (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Base Users */}
            <div className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm">
              <p className="text-sm font-medium text-panel-muted uppercase tracking-wider">Plan Base</p>
              <p className="mt-2 text-3xl font-bold text-panel-text">
                {directoryUsers.filter(u => u.user_type === 'base').length}
              </p>
            </div>

            {/* Kiconu Users */}
            <div className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm">
              <p className="text-sm font-medium text-panel-muted uppercase tracking-wider">Plan Kiconu</p>
              <p className="mt-2 text-3xl font-bold text-panel-text">
                {directoryUsers.filter(u => u.user_type === 'kiconu').length}
              </p>
            </div>

            {/* Premium Users */}
            <div className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm">
              <p className="text-sm font-medium text-panel-muted uppercase tracking-wider">Plan Premium</p>
              <p className="mt-2 text-3xl font-bold text-panel-text">
                {directoryUsers.filter(u => u.user_type === 'premium').length}
              </p>
            </div>

            {/* New Users (This Month) */}
            <div className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-sm">
              <p className="text-sm font-medium text-panel-muted uppercase tracking-wider">Nuevos (Mes)</p>
              <p className="mt-2 text-3xl font-bold text-panel-primary">
                {directoryUsers.filter(u => {
                  if (!u.registration_date) return false;
                  const date = u.registration_date instanceof Date ? u.registration_date : new Date(u.registration_date);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
          </section>
        )}

        {/* Non-admin view removed as it is now handled by /cuenta page */}

        {isAdmin && (
          <section className="rounded-2xl border border-panel-border bg-panel-card p-6 shadow-lg">
            <header className="mb-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-panel-text">Directorio de Usuarios</h2>
                  <p className="text-sm text-panel-muted">Descripción general de cada perfil en la plataforma</p>
                </div>
              </div>

              {/* Search Box */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, apellido o email..."
                    className="w-full rounded-lg border border-panel-border bg-panel-bg px-4 py-2 pl-10 text-panel-text outline-none transition focus:border-panel-primary"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-panel-muted">🔍</span>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="rounded-lg border border-panel-border px-4 py-2 text-sm font-semibold text-panel-muted transition hover:bg-panel-bg"
                  >
                    Limpiar
                  </button>
                )}
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${showInactive
                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                    : "border border-panel-border text-panel-muted hover:bg-panel-bg"
                    }`}
                >
                  {showInactive ? "Ocultar Inactivos" : "Mostrar Inactivos"}
                </button>
              </div>

              {searchQuery && (
                <p className="text-sm text-panel-muted">
                  Mostrando {filteredUsers.length} de {directoryUsers.length} usuarios
                </p>
              )}
            </header>

            {directoryUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-panel-border/60 bg-panel-bg/40 p-8 text-center text-sm text-panel-muted">
                No se encontraron otros usuarios aún. Los miembros invitados aparecerán aquí una vez que creen una cuenta.
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-panel-border/60 bg-panel-bg/40 p-8 text-center text-sm text-panel-muted">
                No se encontraron usuarios que coincidan con &quot;{searchQuery}&quot;.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-panel-border">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-panel-muted">Nombre</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-panel-muted">Apellido</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-panel-muted">Email</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-panel-muted">Coaches</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-panel-muted">Tipo de Usuario</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-panel-muted">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((entry) => (
                      <tr key={entry.user_id} className="border-b border-panel-border/50 transition hover:bg-panel-bg/40">
                        <td className="px-4 py-4 text-sm text-panel-text">{entry.first_name || "—"}</td>
                        <td className="px-4 py-4 text-sm text-panel-text">{entry.last_name || "—"}</td>
                        <td className="px-4 py-4 text-sm text-panel-text">{entry.email}</td>
                        <td className="px-4 py-4 text-center text-sm text-panel-text">
                          {entry.assignedCoaches && entry.assignedCoaches.length > 0 ? entry.assignedCoaches.length : "—"}
                        </td>
                        <td className="px-4 py-4">
                          <select
                            value={entry.user_type || ""}
                            onChange={(e) => handleUserTypeChange(entry.user_id, e.target.value as UserType)}
                            className="rounded-lg border border-panel-border bg-panel-card px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-panel-primary outline-none transition focus:border-panel-primary"
                          >
                            <option value="">Sin seleccionar</option>
                            <option value="base">Base</option>
                            <option value="kiconu">Kiconu</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                            <option value="inactive">Inactivo</option>
                          </select>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openProfileModal(entry)}
                              className="rounded-lg bg-panel-primary/10 px-4 py-2 text-sm font-semibold text-panel-primary transition hover:bg-panel-primary/20"
                            >
                              Perfil
                            </button>
                            <button
                              onClick={() => navigateToCoaching(entry.user_id)}
                              className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-semibold text-panel-text-light transition hover:opacity-90"
                            >
                              Coach
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
