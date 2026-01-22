"use client";

import { useState } from "react";
import { createCourseItem } from "@/lib/firestore-helpers";

interface VideoUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    sectionId: string;
    courseId: string;
    onSuccess: () => void;
}

// Helper to get Mux thumbnail URL
const getMuxThumbnailUrl = (playbackId: string) =>
    `https://image.mux.com/${playbackId}/thumbnail.jpg?time=0`;

export function VideoUploadDialog({ isOpen, onClose, sectionId, courseId, onSuccess }: VideoUploadDialogProps) {
    const [title, setTitle] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");

    const uploadVideoToMux = async (file: File): Promise<{ playbackId: string; assetId: string }> => {
        setStatus("Obteniendo URL de subida...");
        setProgress(5);

        const uploadResponse = await fetch("/api/mux/upload", { method: "POST" });
        if (!uploadResponse.ok) throw new Error("Failed to get upload URL");
        const { uploadUrl, uploadId } = await uploadResponse.json();

        setStatus("Subiendo video a Mux...");
        const xhr = new XMLHttpRequest();

        await new Promise<void>((resolve, reject) => {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const pct = Math.round((event.loaded / event.total) * 80) + 10;
                    setProgress(pct);
                }
            };
            xhr.onload = () => xhr.status === 200 ? resolve() : reject(new Error("Upload failed"));
            xhr.onerror = () => reject(new Error("Upload error"));
            xhr.open("PUT", uploadUrl);
            xhr.send(file);
        });

        setStatus("Procesando video...");
        setProgress(95);

        let assetId = "";
        let attempts = 0;
        while (!assetId && attempts < 30) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(`/api/mux/upload/${uploadId}`);
            const statusData = await statusRes.json();
            if (statusData.assetId) assetId = statusData.assetId;
            attempts++;
        }
        if (!assetId) throw new Error("Failed to get asset ID");

        let playbackId = "";
        attempts = 0;
        while (!playbackId && attempts < 60) {
            await new Promise(r => setTimeout(r, 3000));
            const assetRes = await fetch(`/api/mux/asset/${assetId}`);
            const assetData = await assetRes.json();
            if (assetData.status === "ready" && assetData.playbackId) {
                playbackId = assetData.playbackId;
            } else if (assetData.status === "errored") {
                throw new Error("Asset processing failed");
            }
            attempts++;
        }
        if (!playbackId) throw new Error("Video processing timed out");

        return { playbackId, assetId };
    };

    const handleSubmit = async () => {
        if (!title.trim() || !selectedFile) return;

        setUploading(true);
        setProgress(0);
        setStatus("Iniciando subida...");

        try {
            const muxData = await uploadVideoToMux(selectedFile);
            const fileUrl = getMuxThumbnailUrl(muxData.playbackId);

            setStatus("Guardando...");
            await createCourseItem(sectionId, courseId, title.trim(), "video", fileUrl, muxData);

            handleClose();
            onSuccess();
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
