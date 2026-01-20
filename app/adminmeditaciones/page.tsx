"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
    getMeditations,
    createMeditation,
    deleteMeditation
} from "@/lib/firestore-helpers";
import type { Meditation } from "@/lib/firestore-schema";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

export default function AdminMeditacionesPage() {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();

    const [meditations, setMeditations] = useState<Meditation[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Form state
    const [newTitle, setNewTitle] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!loading) {
            if (!user || !userProfile?.is_admin) {
                router.push("/");
                return;
            }
            fetchMeditations();
        }
    }, [user, userProfile, loading, router]);

    const fetchMeditations = async () => {
        try {
            const data = await getMeditations();
            setMeditations(data);
        } catch (error) {
            console.error("Error fetching meditations:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.startsWith("audio/")) {
                setSelectedFile(file);
                // Extract duration
                const audio = new Audio(URL.createObjectURL(file));
                audio.onloadedmetadata = () => {
                    setDuration(Math.round(audio.duration));
                };
            } else {
                alert("Por favor selecciona un archivo de audio válido.");
                e.target.value = "";
            }
        }
    };

    const handleUploadAndCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !selectedFile || !user) return;

        setIsSubmitting(true);
        setUploadStatus("Iniciando subida...");

        try {
            // 1. Upload file to Storage
            const timestamp = Date.now();
            const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.]/g, "_");
            const storagePath = `meditations/${timestamp}_${sanitizedName}`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    setUploadProgress(progress);
                    setUploadStatus(`Subiendo archivo: ${progress}%`);
                },
                (error) => {
                    console.error("Upload error:", error);
                    alert("Error al subir el archivo.");
                    setIsSubmitting(false);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                        // 2. Create Firestore document
                        setUploadStatus("Guardando datos...");
                        await createMeditation(newTitle.trim(), downloadURL, user.uid, duration);

                        // 3. Reset and refresh
                        setIsAddModalOpen(false);
                        setNewTitle("");
                        setSelectedFile(null);
                        setDuration(0);
                        setUploadProgress(0);
                        setUploadStatus("");
                        fetchMeditations();
                    } catch (err) {
                        console.error("Error creating doc:", err);
                        alert("Error al guardar la meditación.");
                    } finally {
                        setIsSubmitting(false);
                    }
                }
            );

        } catch (error) {
            console.error("Error in process:", error);
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("¿Estás seguro de que deseas eliminar esta meditación?")) {
            try {
                await deleteMeditation(id);
                fetchMeditations();
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Error al eliminar la meditación.");
            }
        }
    };

    if (loading || isLoadingData) {
        return <div className="p-8 text-center">Cargando...</div>;
    }

    if (!userProfile?.is_admin) return null;

    return (
        <div className="min-h-screen bg-panel-bg">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-panel-text">Administrar Meditaciones</h1>
                        <p className="text-panel-muted mt-1">Gestiona el contenido de audio para meditación</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="rounded-lg bg-panel-primary px-4 py-2 text-white transition hover:bg-panel-primary/90"
                    >
                        Agregar Meditación
                    </button>
                </div>

                <div className="rounded-xl border border-panel-border bg-panel-card overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-panel-border">
                        <thead className="bg-panel-bg">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-panel-muted">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-panel-muted">Duración</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-panel-muted">Fecha</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-panel-muted">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-panel-border bg-panel-card">
                            {meditations.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-panel-muted">
                                        No hay meditaciones registradas.
                                    </td>
                                </tr>
                            ) : (
                                meditations.map((med) => (
                                    <tr key={med.id}>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-panel-text">
                                            {med.title}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-panel-muted">
                                            {med.duration ? `${Math.floor(med.duration / 60)}:${Math.round(med.duration % 60).toString().padStart(2, '0')}` : '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-panel-muted">
                                            {med.created_at.toLocaleDateString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                                            <button
                                                onClick={() => handleDelete(med.id)}
                                                className="text-red-500 hover:text-red-700 font-medium"
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-panel-card p-6 shadow-xl border border-panel-border">
                        <h2 className="mb-4 text-xl font-bold text-panel-text">Nueva Meditación</h2>
                        <form onSubmit={handleUploadAndCreate} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-panel-text">
                                    Título
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full rounded-lg border border-panel-border bg-panel-input p-2.5 text-panel-text outline-none focus:border-panel-primary"
                                    placeholder="Ej. Meditación Matutina"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-panel-text">
                                    Archivo de Audio
                                </label>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-panel-muted file:mr-4 file:rounded-lg file:border-0 file:bg-panel-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-panel-primary hover:file:bg-panel-primary/20"
                                    required
                                />
                            </div>

                            {uploadStatus && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-panel-muted">
                                        <span>{uploadStatus}</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-border">
                                        <div
                                            className="h-full bg-panel-primary transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-panel-muted hover:bg-panel-border transition disabled:opacity-50"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newTitle || !selectedFile || isSubmitting}
                                    className="rounded-lg bg-panel-primary px-4 py-2 text-sm font-medium text-white hover:bg-panel-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
