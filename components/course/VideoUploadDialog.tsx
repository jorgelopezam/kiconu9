"use client";

import { useState } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { createCourseItem } from "@/lib/firestore-helpers";

interface VideoUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sectionId: string;
    courseId: string;
    onSuccess: () => void;
}

export function VideoUploadDialog({ isOpen, onClose, sectionId, courseId, onSuccess }: VideoUploadDialogProps) {
    const [title, setTitle] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    const handleSubmit = async () => {
        if (!title.trim() || !selectedFile) return;

        setUploading(true);
        setProgress(0);
        setStatus("Subiendo video...");

        try {
            const fileName = `${Date.now()}_${selectedFile.name}`;
            // Upload to Firebase Storage instead of Mux
            const storageRef = ref(storage, `courses/videos/${courseId}/${fileName}`);
            const uploadTask = uploadBytesResumable(storageRef, selectedFile);

            await new Promise<string>((resolve, reject) => {
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        setProgress(pct);
                    },
                    reject,
                    async () => {
                        const url = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(url);
                    }
                );
            }).then(async (fileUrl) => {
                setStatus("Guardando...");
                // Pass null for muxData since we are using Firebase Storage
                await createCourseItem(sectionId, courseId, title.trim(), "video", fileUrl);
                handleClose();
                onSuccess();
            });
        } catch (error) {
            console.error("Error uploading video:", error);
            alert("Error al subir el video");
            setUploading(false);
        }
    };

    const handleClose = () => {
        setTitle("");
        setSelectedFile(null);
        setUploading(false);
        setProgress(0);
        setStatus("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
                <h2 className="mb-4 text-xl font-bold text-foreground">Agregar Video</h2>
                <div className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Título</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Video de bienvenida"
                            className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium text-foreground">Archivo de Video</label>
                        <input
                            type="file"
                            accept=".mov,.mp4,.webm,.m4v,video/mp4,video/quicktime,video/webm"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                            className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-white file:cursor-pointer"
                        />
                        {selectedFile && (
                            <p className="mt-1 text-xs text-muted-foreground truncate">
                                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                            </p>
                        )}
                    </div>
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{status}</span>
                                <span className="font-medium text-foreground">{progress}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-sage/20 overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={handleClose}
                        disabled={uploading}
                        className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={uploading || !title.trim() || !selectedFile}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                    >
                        {uploading ? "Subiendo..." : "Agregar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
