"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, updateUserProfile, updateUserRegistrationDetails } from "@/lib/firestore-helpers";
import type { User } from "@/lib/firestore-schema";
import { updatePassword } from "firebase/auth";

export default function AccountPage() {
    const { user, userProfile, loading, refreshProfile } = useAuth();
    const router = useRouter();

    // Use profile from context, fallback to local state if needed (though context should handle it)
    // We can just derive state from props if we want, or keep local state for editing
    // Let's initialize local state from context when it's available

    // Edit states
    const [editingField, setEditingField] = useState<string | null>(null);
    const [tempValue, setTempValue] = useState<string | number>("");
    const [updating, setUpdating] = useState(false);

    // Password change states
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [updatingPassword, setUpdatingPassword] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/");
        }
    }, [user, loading, router]);

    // Derived profile to use (context takes precedence)
    const profile = userProfile;

    const handleEditStart = (field: string, value: string | number | undefined) => {
        setEditingField(field);
        setTempValue(value === undefined ? "" : value);
    };

    const handleCancelEdit = () => {
        setEditingField(null);
        setTempValue("");
    };

    const handleSaveField = async (field: string) => {
        if (!user || !profile) return;

        setUpdating(true);
        try {
            if (["age", "height", "weight"].includes(field)) {
                await updateUserRegistrationDetails(user.uid, {
                    ...{
                        age: profile.age || 0,
                        height: profile.height || 0,
                        weight: profile.weight || 0,
                        gender: profile.gender || "prefer_not_to_say"
                    },
                    [field]: Number(tempValue)
                });
            } else {
                // @ts-ignore - Dynamic key access
                await updateUserProfile(user.uid, { [field]: tempValue });
            }

            // Refresh global profile logic
            await refreshProfile();
            setEditingField(null);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Error al actualizar el perfil");
        } finally {
            setUpdating(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (newPassword !== confirmPassword) {
            setPasswordError("Las contraseñas no coinciden");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        if (!user) return;

        setUpdatingPassword(true);
        try {
            await updatePassword(user, newPassword);
            setPasswordSuccess("Contraseña actualizada exitosamente");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            console.error("Error updating password:", error);
            if (error.code === 'auth/requires-recent-login') {
                setPasswordError("Por seguridad, debes cerrar sesión e iniciar de nuevo para cambiar tu contraseña.");
            } else {
                setPasswordError("Error al actualizar la contraseña: " + error.message);
            }
        } finally {
            setUpdatingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!profile) return null;

    const renderField = (label: string, fieldKey: string, value: string | number | undefined, type: "text" | "number" = "text", suffix?: string, className?: string) => {
        const isEditing = editingField === fieldKey;

        return (
            <div className={`flex items-center justify-between border-b border-sage/20 py-3 last:border-0 ${className || ""}`}>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                    {isEditing ? (
                        <div className="flex items-center gap-2 pr-2">
                            <input
                                type={type}
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="w-full rounded-lg border border-sage/40 bg-white px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                            />
                            <button
                                onClick={() => handleSaveField(fieldKey)}
                                disabled={updating}
                                className="rounded-lg bg-primary p-2 text-white transition hover:bg-primary-600 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">check</span>
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                disabled={updating}
                                className="rounded-lg border border-sage/40 bg-white p-2 text-muted-foreground transition hover:bg-desert-sand/30 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>
                    ) : (
                        <p className="text-base font-medium text-foreground truncate">
                            {value || "-"} {suffix && value ? suffix : ""}
                        </p>
                    )}
                </div>
                {!isEditing && (
                    <button
                        onClick={() => handleEditStart(fieldKey, value)}
                        className="ml-2 rounded-full p-1.5 text-primary transition hover:bg-primary/10"
                        aria-label={`Editar ${label}`}
                    >
                        <span className="material-symbols-outlined">edit</span>
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="mx-auto max-w-2xl px-4 py-6">
            <h1 className="mb-6 text-2xl font-bold text-foreground">Mi Cuenta</h1>

            {/* Personal Information */}
            <section className="mb-6 rounded-2xl border border-sage/20 bg-surface/50 p-5 shadow-sm backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">person</span>
                    {profile.user_type
                        ? `Plan: ${profile.user_type.charAt(0).toUpperCase() + profile.user_type.slice(1)}`
                        : "Información Personal"}
                </h2>

                <div className="divide-y divide-sage/10">
                    {/* Email is read-only usually */}
                    <div className="py-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                        <p className="text-base font-medium text-foreground opacity-80">{profile.email}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                        {renderField("Nombre", "first_name", profile.first_name, "text", "", "border-none")}
                        {renderField("Apellido", "last_name", profile.last_name, "text", "", "border-none")}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                        {renderField("Estatura", "height", profile.height, "number", "cm", "border-none")}
                        {renderField("Peso", "weight", profile.weight, "number", "kg", "border-none")}
                    </div>

                    {renderField("Edad", "age", profile.age, "number", "años")}
                </div>
            </section>

            {/* Security */}
            <section className="rounded-2xl border border-sage/20 bg-surface/50 p-5 shadow-sm backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
                    <span className="material-symbols-outlined text-xl">lock</span>
                    Seguridad
                </h2>

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    {passwordError && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                            {passwordError}
                        </div>
                    )}
                    {passwordSuccess && (
                        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            {passwordSuccess}
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Nueva Contraseña
                        </label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full rounded-xl border border-sage/40 bg-white px-4 py-2.5 text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">
                            Confirmar Contraseña
                        </label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full rounded-xl border border-sage/40 bg-white px-4 py-2.5 text-foreground shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={updatingPassword || !newPassword || !confirmPassword}
                        className="mt-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {updatingPassword ? "Actualizando..." : "Cambiar Contraseña"}
                    </button>
                </form>
            </section>
        </div>
    );
}
