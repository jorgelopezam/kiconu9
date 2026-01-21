"use client";

import { Suspense, useCallback, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
    getUserProfile,
    getCourseSections,
    getCourseItems,
    createCourseSection,
    updateCourseSection,
    deleteCourseSection,
    createCourseItem,
    deleteCourseItem,
    reorderCourseSections,
    reorderCourseItems,
} from "@/lib/firestore-helpers";
import { doc, getDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { COLLECTIONS } from "@/lib/firestore-schema";
import type { Course, CourseSection, CourseItem, CourseItemType } from "@/lib/firestore-schema";
import { getMuxThumbnailUrl } from "@/lib/mux";

export default function AdminCursosContenidoPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-foreground">Cargando...</div></div>}>
            <AdminCursosContenidoContent />
        </Suspense>
    );
}

function AdminCursosContenidoContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = searchParams.get("courseId");

    const [isAdmin, setIsAdmin] = useState(false);
    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [sectionItems, setSectionItems] = useState<Record<string, CourseItem[]>>({});
    const [loadingData, setLoadingData] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // Add section modal
    const [showAddSectionModal, setShowAddSectionModal] = useState(false);
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [addingSectionLoading, setAddingSectionLoading] = useState(false);

    // Edit section modal
    const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
    const [editSectionTitle, setEditSectionTitle] = useState("");

    // Add item modal
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [addItemSectionId, setAddItemSectionId] = useState<string | null>(null);
    const [newItemTitle, setNewItemTitle] = useState("");
    const [newItemType, setNewItemType] = useState<CourseItemType | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [addingItemLoading, setAddingItemLoading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        } else if (!loading && user && !isAdmin && !loadingData) {
            router.push("/panel");
        }
    }, [user, loading, isAdmin, loadingData, router]);

    // Fetch course and content
    const fetchData = useCallback(async () => {
        if (!courseId || !user || !isAdmin) return;

        setLoadingData(true);
        try {
            // Get course details
            const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
            const courseSnap = await getDoc(courseRef);
            if (courseSnap.exists()) {
                const data = courseSnap.data();
                setCourse({
                    id: courseSnap.id,
                    title: data.title,
                    access_level: data.access_level,
                    status: data.status,
                    created_at: data.created_at?.toDate() || new Date(),
                    created_by: data.created_by,
                } as Course);
            }

            // Get sections
            const sectionsData = await getCourseSections(courseId);
            setSections(sectionsData);

            // Get items for all sections
            const itemsMap: Record<string, CourseItem[]> = {};
            for (const section of sectionsData) {
                const items = await getCourseItems(section.id);
                itemsMap[section.id] = items;
            }
            setSectionItems(itemsMap);

            // Expand first section by default
            if (sectionsData.length > 0) {
                setExpandedSections(new Set([sectionsData[0].id]));
            }
        } catch (error) {
            console.error("Error fetching course data:", error);
        } finally {
            setLoadingData(false);
        }
    }, [courseId, user, isAdmin]);

    useEffect(() => {
        if (user && isAdmin && courseId) {
            fetchData();
        }
    }, [user, isAdmin, courseId, fetchData]);

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    // Add section
    const handleAddSection = async () => {
        if (!courseId || !newSectionTitle.trim()) return;

        setAddingSectionLoading(true);
        try {
            const nextOrder = sections.length;
            await createCourseSection(courseId, newSectionTitle.trim(), nextOrder);
            setNewSectionTitle("");
            setShowAddSectionModal(false);
            await fetchData();
        } catch (error) {
            console.error("Error adding section:", error);
        } finally {
            setAddingSectionLoading(false);
        }
    };

    // Update section title
    const handleUpdateSectionTitle = async () => {
        if (!editingSectionId || !editSectionTitle.trim()) return;

        try {
            await updateCourseSection(editingSectionId, { title: editSectionTitle.trim() });
            setEditingSectionId(null);
            setEditSectionTitle("");
            await fetchData();
        } catch (error) {
            console.error("Error updating section:", error);
        }
    };

    // Delete section
    const handleDeleteSection = async (sectionId: string) => {
        if (!confirm("¿Estás seguro de eliminar esta sección y todo su contenido?")) return;

        try {
            await deleteCourseSection(sectionId);
            await fetchData();
        } catch (error) {
            console.error("Error deleting section:", error);
        }
    };

    // Move section
    const handleMoveSection = async (sectionId: string, direction: "up" | "down") => {
        const index = sections.findIndex(s => s.id === sectionId);
        if ((direction === "up" && index === 0) || (direction === "down" && index === sections.length - 1)) return;

        const newIndex = direction === "up" ? index - 1 : index + 1;
        const newSections = [...sections];
        [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];

        try {
            await reorderCourseSections(courseId!, newSections.map(s => s.id));
            await fetchData();
        } catch (error) {
            console.error("Error reordering sections:", error);
        }
    };

    // Upload file to Firebase Storage
    const uploadToStorage = async (file: File, itemType: CourseItemType): Promise<string> => {
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `courses/${courseId}/${itemType}s/${timestamp}_${sanitizedName}`;
        const storageRef = ref(storage, path);

        return new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                (snapshot) => {
                    const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    setUploadProgress(progress);
                    setUploadStatus(`Subiendo archivo: ${progress}%`);
                },
                (error) => {
                    console.error("Upload error:", error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                }
            );
        });
    };

    // Upload video to Mux
    const uploadVideoToMux = async (file: File): Promise<{ playbackId: string; assetId: string }> => {
        setUploadStatus("Creando URL de subida...");

        // Create direct upload URL
        const uploadResponse = await fetch("/api/mux/create-upload", {
            method: "POST",
        });

        if (!uploadResponse.ok) {
            throw new Error("No se pudo crear la URL de subida");
        }

        const { uploadUrl, uploadId } = await uploadResponse.json();

        setUploadStatus("Subiendo video a Mux...");

        // Upload video to Mux
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(percentComplete);
                    setUploadStatus(`Subiendo video: ${percentComplete}%`);
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Error al subir a Mux: ${xhr.status}`));
                }
            });

            xhr.addEventListener("error", () => reject(new Error("Error de red durante la subida")));
            xhr.open("PUT", uploadUrl);
            xhr.send(file);
        });

        setUploadStatus("Procesando video...");

        // Poll for asset ID
        let assetId: string | null = null;
        let attempts = 0;

        while (!assetId && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                const statusResponse = await fetch(`/api/mux/upload/${uploadId}`);
                if (statusResponse.ok) {
                    const uploadStatus = await statusResponse.json();
                    if (uploadStatus.assetId) {
                        assetId = uploadStatus.assetId;
                    }
                    if (uploadStatus.status === "errored") {
                        throw new Error("Mux upload failed");
                    }
                }
            } catch (error) {
                console.log("Waiting for upload to complete...");
            }

            attempts++;
        }

        if (!assetId) {
            throw new Error("Upload timed out");
        }

        // Wait for asset to be ready
        setUploadStatus("Esperando procesamiento del video...");
        let assetReady = false;
        let playbackId = "";
        attempts = 0;

        while (!assetReady && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 3000));

            try {
                const assetResponse = await fetch(`/api/mux/asset/${assetId}`);
                const assetData = await assetResponse.json();

                if (assetData.status === "ready" && assetData.playbackId) {
                    assetReady = true;
                    playbackId = assetData.playbackId;
                } else if (assetData.status === "errored") {
                    throw new Error("Asset processing failed");
                }
            } catch (error) {
                console.log("Asset not ready yet...");
            }

            attempts++;
        }

        if (!assetReady || !playbackId) {
            throw new Error("Video processing timed out");
        }

        return { playbackId, assetId };
    };

    // Add item
    const handleAddItem = async () => {
        if (!courseId || !addItemSectionId || !newItemTitle.trim() || !selectedFile || !newItemType) return;

        const itemType = newItemType; // Capture for TypeScript narrowing

        setAddingItemLoading(true);
        setUploadProgress(0);
        setUploadStatus("Iniciando subida...");

        try {
            let fileUrl = "";
            let muxData: { playbackId: string; assetId: string } | undefined;

            if (itemType === "video") {
                // Upload to Mux
                muxData = await uploadVideoToMux(selectedFile);
                fileUrl = getMuxThumbnailUrl(muxData.playbackId);
            } else {
                // Upload to Firebase Storage
                fileUrl = await uploadToStorage(selectedFile, itemType);
            }

            await createCourseItem(
                addItemSectionId,
                courseId,
                newItemTitle.trim(),
                itemType,
                fileUrl,
                muxData
            );

            // Reset form
            setNewItemTitle("");
            setNewItemType(null);
            setSelectedFile(null);
            setShowAddItemModal(false);
            setAddItemSectionId(null);
            setUploadProgress(0);
            setUploadStatus("");
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            await fetchData();
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Error al subir el archivo. Por favor intenta de nuevo.");
        } finally {
            setAddingItemLoading(false);
        }
    };

    // Delete item
    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("¿Estás seguro de eliminar este elemento?")) return;

        try {
            await deleteCourseItem(itemId);
            await fetchData();
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    };

    // Move item
    const handleMoveItem = async (sectionId: string, itemId: string, direction: "up" | "down") => {
        const items = sectionItems[sectionId] || [];
        const index = items.findIndex(i => i.id === itemId);
        if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) return;

        const newIndex = direction === "up" ? index - 1 : index + 1;
        const newItems = [...items];
        [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];

        try {
            await reorderCourseItems(sectionId, newItems.map(i => i.id));
            await fetchData();
        } catch (error) {
            console.error("Error reordering items:", error);
        }
    };

    const getItemTypeIcon = (type: CourseItemType) => {
        switch (type) {
            case "image": return "image";
            case "audio": return "headphones";
            case "video": return "play_circle";
            case "document": return "description";
        }
    };

    const getItemTypeColor = (type: CourseItemType) => {
        switch (type) {
            case "image": return "text-green-500";
            case "audio": return "text-blue-500";
            case "video": return "text-red-500";
            case "document": return "text-amber-600";
        }
    };

    const getAcceptedFiles = (type: CourseItemType) => {
        switch (type) {
            case "image": return "image/*";
            case "audio": return "audio/*,.mp3,.m4a,.wav,.aac";
            case "video": return ".mov,.mp4,.webm,.m4v,video/mp4,video/quicktime,video/webm";
            case "document": return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx";
        }
    };

    if (loading || loadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-foreground">Cargando...</div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return null;
    }

    if (!course) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-muted-foreground/40 mb-4">error</span>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Curso no encontrado</h2>
                    <Link href="/admincursos" className="text-primary hover:underline">
                        Volver a cursos
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="mx-auto max-w-4xl flex flex-col gap-6 py-10 px-4 md:px-10">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <Link
                        href="/admincursos"
                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver a cursos
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
                    <p className="text-muted-foreground">Administra el contenido del curso</p>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                    {sections.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-sage/30 rounded-xl">
                            <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-2">folder_open</span>
                            <p className="text-muted-foreground">No hay secciones. Agrega una para comenzar.</p>
                        </div>
                    ) : (
                        sections.map((section, sectionIndex) => (
                            <div key={section.id} className="border border-sage/20 rounded-xl overflow-hidden bg-surface">
                                {/* Section header */}
                                <div className="flex items-center gap-2 p-4 bg-desert-sand/20 dark:bg-sage/15">
                                    <button
                                        onClick={() => toggleSection(section.id)}
                                        className="flex-1 flex items-center gap-3 text-left"
                                    >
                                        <span className={`material-symbols-outlined text-muted-foreground transition-transform ${expandedSections.has(section.id) ? "rotate-180" : ""}`}>
                                            expand_more
                                        </span>
                                        {editingSectionId === section.id ? (
                                            <input
                                                type="text"
                                                value={editSectionTitle}
                                                onChange={(e) => setEditSectionTitle(e.target.value)}
                                                onBlur={handleUpdateSectionTitle}
                                                onKeyDown={(e) => e.key === "Enter" && handleUpdateSectionTitle()}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                                className="flex-1 px-2 py-1 rounded border border-sage/40 bg-background text-foreground"
                                            />
                                        ) : (
                                            <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                                        )}
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {/* Move buttons */}
                                        <button
                                            onClick={() => handleMoveSection(section.id, "up")}
                                            disabled={sectionIndex === 0}
                                            className="p-1.5 rounded-lg hover:bg-sage/10 text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Mover arriba"
                                        >
                                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                                        </button>
                                        <button
                                            onClick={() => handleMoveSection(section.id, "down")}
                                            disabled={sectionIndex === sections.length - 1}
                                            className="p-1.5 rounded-lg hover:bg-sage/10 text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                                            title="Mover abajo"
                                        >
                                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                                        </button>

                                        {/* Edit button */}
                                        <button
                                            onClick={() => {
                                                setEditingSectionId(section.id);
                                                setEditSectionTitle(section.title);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-sage/10 text-muted-foreground"
                                            title="Editar título"
                                        >
                                            <span className="material-symbols-outlined text-lg">edit</span>
                                        </button>

                                        {/* Delete button */}
                                        <button
                                            onClick={() => handleDeleteSection(section.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                                            title="Eliminar sección"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Section content */}
                                {expandedSections.has(section.id) && (
                                    <div className="border-t border-sage/10">
                                        {/* Items list */}
                                        {sectionItems[section.id]?.length === 0 ? (
                                            <div className="p-6 text-center text-muted-foreground">
                                                No hay contenido en esta sección
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-sage/10">
                                                {sectionItems[section.id]?.map((item, itemIndex) => (
                                                    <li key={item.id} className="flex items-center gap-3 p-4 hover:bg-sage/5">
                                                        <span className={`material-symbols-outlined text-2xl ${getItemTypeColor(item.type)}`}>
                                                            {getItemTypeIcon(item.type)}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-foreground truncate">{item.title}</p>
                                                            <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleMoveItem(section.id, item.id, "up")}
                                                                disabled={itemIndex === 0}
                                                                className="p-1 rounded hover:bg-sage/10 text-muted-foreground disabled:opacity-30"
                                                                title="Mover arriba"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleMoveItem(section.id, item.id, "down")}
                                                                disabled={itemIndex === (sectionItems[section.id]?.length || 0) - 1}
                                                                className="p-1 rounded hover:bg-sage/10 text-muted-foreground disabled:opacity-30"
                                                                title="Mover abajo"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteItem(item.id)}
                                                                className="p-1 rounded hover:bg-red-500/10 text-red-500"
                                                                title="Eliminar"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Add item button */}
                                        <div className="p-4 border-t border-sage/10">
                                            <button
                                                onClick={() => {
                                                    setAddItemSectionId(section.id);
                                                    setShowAddItemModal(true);
                                                }}
                                                className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-600 transition"
                                            >
                                                <span className="material-symbols-outlined text-lg">add</span>
                                                Agregar Contenido
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Add section button */}
                <button
                    onClick={() => setShowAddSectionModal(true)}
                    className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-sage/30 rounded-xl text-muted-foreground hover:border-primary hover:text-primary transition"
                >
                    <span className="material-symbols-outlined">add</span>
                    Agregar Sección
                </button>
            </div>

            {/* Add Section Modal */}
            {showAddSectionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-foreground">Nueva Sección</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-foreground">Título de la sección</label>
                                <input
                                    type="text"
                                    value={newSectionTitle}
                                    onChange={(e) => setNewSectionTitle(e.target.value)}
                                    placeholder="Ej: Introducción"
                                    className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowAddSectionModal(false);
                                    setNewSectionTitle("");
                                }}
                                className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddSection}
                                disabled={addingSectionLoading || !newSectionTitle.trim()}
                                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                            >
                                {addingSectionLoading ? "Creando..." : "Crear Sección"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-bold text-foreground">Agregar Contenido</h2>

                        {/* Step 1: Type Selection */}
                        {!newItemType && (
                            <div>
                                <p className="mb-3 text-sm text-muted-foreground">Selecciona el tipo de contenido:</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["image", "audio", "video", "document"] as CourseItemType[]).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setNewItemType(type);
                                                setSelectedFile(null);
                                            }}
                                            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-sage/30 text-muted-foreground hover:border-primary hover:bg-primary/5 transition"
                                        >
                                            <span className={`material-symbols-outlined text-3xl ${getItemTypeColor(type)}`}>
                                                {getItemTypeIcon(type)}
                                            </span>
                                            <span className="text-sm font-medium capitalize">
                                                {type === "document" ? "Documento" : type === "image" ? "Imagen" : type === "audio" ? "Audio" : "Video"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setShowAddItemModal(false);
                                            setAddItemSectionId(null);
                                        }}
                                        className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Type-specific form */}
                        {newItemType && (
                            <div className="space-y-4">
                                {/* Selected type indicator with back button */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                                    <span className={`material-symbols-outlined text-2xl ${getItemTypeColor(newItemType)}`}>
                                        {getItemTypeIcon(newItemType)}
                                    </span>
                                    <span className="font-medium text-foreground capitalize">
                                        {newItemType === "document" ? "Documento" : newItemType === "image" ? "Imagen" : newItemType === "audio" ? "Audio" : "Video"}
                                    </span>
                                    <button
                                        onClick={() => {
                                            setNewItemType(null);
                                            setSelectedFile(null);
                                            setNewItemTitle("");
                                        }}
                                        className="ml-auto text-xs text-primary hover:underline"
                                    >
                                        Cambiar
                                    </button>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Título a mostrar</label>
                                    <input
                                        type="text"
                                        value={newItemTitle}
                                        onChange={(e) => setNewItemTitle(e.target.value)}
                                        placeholder="Ej: Video de Bienvenida"
                                        className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                        autoFocus
                                    />
                                </div>

                                {/* Separate file inputs for each type */}
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-foreground">Archivo</label>

                                    {newItemType === "image" && (
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-white file:cursor-pointer"
                                        />
                                    )}

                                    {newItemType === "audio" && (
                                        <input
                                            type="file"
                                            accept="audio/*,.mp3,.m4a,.wav,.aac"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-white file:cursor-pointer"
                                        />
                                    )}

                                    {newItemType === "video" && (
                                        <input
                                            type="file"
                                            accept=".mov,.mp4,.webm,.m4v,video/mp4,video/quicktime,video/webm"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-white file:cursor-pointer"
                                        />
                                    )}

                                    {newItemType === "document" && (
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-white file:cursor-pointer"
                                        />
                                    )}

                                    {selectedFile && (
                                        <p className="mt-1 text-xs text-muted-foreground truncate">
                                            {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                        </p>
                                    )}
                                </div>

                                {/* Upload progress */}
                                {addingItemLoading && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">{uploadStatus}</span>
                                            <span className="font-medium text-foreground">{uploadProgress}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-sage/20 overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setShowAddItemModal(false);
                                            setAddItemSectionId(null);
                                            setNewItemTitle("");
                                            setNewItemType(null);
                                            setSelectedFile(null);
                                        }}
                                        disabled={addingItemLoading}
                                        className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20 disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleAddItem}
                                        disabled={addingItemLoading || !newItemTitle.trim() || !selectedFile}
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
                                    >
                                        {addingItemLoading ? "Subiendo..." : "Agregar"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
