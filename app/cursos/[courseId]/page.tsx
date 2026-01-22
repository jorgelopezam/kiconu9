"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile, getCourseSections, getCourseItems } from "@/lib/firestore-helpers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firestore-schema";
import type { User, Course, CourseSection, CourseItem } from "@/lib/firestore-schema";
import AudioPlayer from "../../../components/media/AudioPlayer";
import MuxVideoPlayer from "../../../components/common/MuxVideoPlayer";
import SimpleVideoPlayer from "@/components/common/SimpleVideoPlayer";

// Legacy course content for "cortisol" course (backwards compatibility)
interface LegacyCourseContent {
    type: "video" | "audio" | "pdf";
    title: string;
    file: string;
}

interface LegacyCourseStage {
    title: string;
    content: LegacyCourseContent[];
}

const CORTISOL_LEGACY_STAGES: LegacyCourseStage[] = [
    {
        title: "Introducción",
        content: [
            { type: "video", title: "Video de Bienvenida", file: "/cursos/cortisol/0.1.0Video1.mp4" },
            { type: "audio", title: "Introducción al Programa", file: "/cursos/cortisol/0.2.0 Introducción .m4a" },
        ]
    },
    {
        title: "Eje 1: Sueño y Ritmo Circadiano",
        content: [
            { type: "audio", title: "Sueño y Ritmo Circadiano (1)", file: "/cursos/cortisol/1.1.0 Eje 1. Sueño y ritmo circadiano.m4a" },
            { type: "audio", title: "Sueño y Ritmo Circadiano (2)", file: "/cursos/cortisol/1.1.0 Sueño y ritmo circadiano. Video 2.m4a" },
            { type: "pdf", title: "Regulación del Sueño - Instrucciones", file: "/cursos/cortisol/1.2.0 Regulación del sueño. instrucciones.pdf" },
            { type: "pdf", title: "Regulación del Sueño - Tablas", file: "/cursos/cortisol/1.2.1 Regulación del sueño. tablas.pdf" },
        ]
    },
    {
        title: "Eje 2: Alimentación e Hidratación",
        content: [
            { type: "audio", title: "Alimentación Energética", file: "/cursos/cortisol/2.1.0 Alimentación energetica.m4a" },
            { type: "audio", title: "Estructura de Alimentación", file: "/cursos/cortisol/2.2.0 Alimentación. Estructura.m4a" },
            { type: "audio", title: "Hidratación", file: "/cursos/cortisol/2.3.0 Eje 2. Hidratacion.m4a" },
            { type: "audio", title: "Complementos", file: "/cursos/cortisol/2.4.0 Eje 2. Complementos.m4a" },
            { type: "pdf", title: "Detox del Cortisol - Recetas Ritual", file: "/cursos/cortisol/2.5.0 Detox del cortisol. recetas ritual.pdf" },
            { type: "pdf", title: "Recetas de Desayunos", file: "/cursos/cortisol/2.6.0 Alimentacion. Recetas de desayunos.pdf" },
            { type: "pdf", title: "Recomendaciones para una Hidratación Correcta", file: "/cursos/cortisol/2.7.0 Alimentacion. recomendaciones para una hidratacion correcta.pdf" },
        ]
    },
    {
        title: "Eje 3: Pranayama y Meditación",
        content: [
            { type: "audio", title: "Pranayama y Meditación", file: "/cursos/cortisol/3.1.0  Pranayama y meditación.m4a" },
        ]
    }
];

// Currently playing media state
interface PlayingMedia {
    type: "audio" | "video" | "mux-video";
    file: string;
    title: string;
    muxPlaybackId?: string;
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([0]));
    const [playingMedia, setPlayingMedia] = useState<PlayingMedia | null>(null);

    // Dynamic course data from Firestore
    const [course, setCourse] = useState<Course | null>(null);
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [sectionItems, setSectionItems] = useState<Record<string, CourseItem[]>>({});
    const [useLegacy, setUseLegacy] = useState(false);

    const courseId = params.courseId as string;

    // Check if this is the legacy cortisol course
    const isLegacyCortisol = courseId === "cortisol";

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const userProfile = await getUserProfile(user.uid);
                setProfile(userProfile);

                // Try to load from Firestore first
                let courseDoc = null;

                if (isLegacyCortisol) {
                    // For legacy "cortisol" slug, we need to find the course by title
                    // Check if there's Firestore content first
                    setUseLegacy(true); // Default to legacy for cortisol slug
                } else {
                    // Load course from Firestore by ID
                    const courseRef = doc(db, COLLECTIONS.COURSES, courseId);
                    const courseSnap = await getDoc(courseRef);

                    if (courseSnap.exists()) {
                        const data = courseSnap.data();
                        courseDoc = {
                            id: courseSnap.id,
                            title: data.title,
                            access_level: data.access_level,
                            status: data.status,
                            created_at: data.created_at?.toDate() || new Date(),
                            created_by: data.created_by,
                        } as Course;
                        setCourse(courseDoc);

                        // Load sections and items
                        const sectionsData = await getCourseSections(courseId);
                        setSections(sectionsData);

                        const itemsMap: Record<string, CourseItem[]> = {};
                        for (const section of sectionsData) {
                            const items = await getCourseItems(section.id);
                            itemsMap[section.id] = items;
                        }
                        setSectionItems(itemsMap);

                        setUseLegacy(false);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading, courseId, isLegacyCortisol]);

    const toggleStage = (index: number) => {
        setExpandedStages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case "video": return "play_circle";
            case "audio": return "headphones";
            case "pdf":
            case "document": return "description";
            case "image": return "image";
            default: return "insert_drive_file";
        }
    };

    const getContentColor = (type: string) => {
        switch (type) {
            case "video": return "text-red-500";
            case "audio": return "text-blue-500";
            case "pdf":
            case "document": return "text-amber-600";
            case "image": return "text-green-500";
            default: return "text-muted-foreground";
        }
    };

    // Course title for display
    const courseTitle = useMemo(() => {
        if (useLegacy && isLegacyCortisol) {
            return "Depuración de Cortisol";
        }
        return course?.title || "Curso";
    }, [useLegacy, isLegacyCortisol, course]);

    const courseDescription = useMemo(() => {
        if (useLegacy && isLegacyCortisol) {
            return "Un programa completo para regular tu cortisol y recuperar tu bienestar a través del sueño, la alimentación y técnicas de relajación.";
        }
        return "";
    }, [useLegacy, isLegacyCortisol]);

    if (authLoading || loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-foreground animate-pulse">Cargando curso...</div>
            </div>
        );
    }

    if (!user || !profile) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Acceso Restringido</h2>
                    <p className="text-muted-foreground">Debes iniciar sesión para ver este contenido.</p>
                </div>
            </div>
        );
    }

    // Check if course exists (either legacy or dynamic)
    if (!useLegacy && !course) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-center">
                    <span className="material-symbols-outlined text-6xl text-muted-foreground/40 mb-4">error_outline</span>
                    <h2 className="text-xl font-semibold text-foreground mb-2">Curso no encontrado</h2>
                    <p className="text-muted-foreground mb-4">El curso que buscas no existe o no está disponible.</p>
                    <Link
                        href="/cursos"
                        className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver a cursos
                    </Link>
                </div>
            </div>
        );
    }

    // Render legacy cortisol content
    if (useLegacy && isLegacyCortisol) {
        return (
            <div className="min-h-screen bg-background">
                <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Back button */}
                    <Link
                        href="/cursos"
                        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Volver a cursos
                    </Link>

                    {/* Course header */}
                    <header className="mb-8">
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-4">
                            {courseTitle}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {courseDescription}
                        </p>
                    </header>

                    {/* Stages */}
                    <div className="space-y-4">
                        {CORTISOL_LEGACY_STAGES.map((stage, stageIndex) => (
                            <div
                                key={stageIndex}
                                className="border border-sage/20 rounded-xl overflow-hidden bg-surface"
                            >
                                {/* Stage header - clickable */}
                                <button
                                    onClick={() => toggleStage(stageIndex)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-desert-sand/20 dark:bg-sage/15 hover:bg-desert-sand/30 dark:hover:bg-sage/20 transition"
                                >
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">
                                            {stage.title}
                                        </h2>
                                    </div>
                                    <span className={`material-symbols-outlined text-muted-foreground transition-transform ${expandedStages.has(stageIndex) ? "rotate-180" : ""
                                        }`}>
                                        expand_more
                                    </span>
                                </button>

                                {/* Stage content */}
                                {expandedStages.has(stageIndex) && (
                                    <div className="border-t border-sage/10 pl-4 sm:pl-6">
                                        <ul className="divide-y divide-sage/10">
                                            {stage.content.map((item, contentIndex) => (
                                                <li key={contentIndex}>
                                                    {item.type === "pdf" ? (
                                                        <a
                                                            href={item.file}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group cursor-pointer"
                                                        >
                                                            <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                                {getContentIcon(item.type)}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-foreground font-medium truncate">
                                                                    {item.title}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Documento PDF
                                                                </p>
                                                            </div>
                                                            <span className="material-symbols-outlined text-muted-foreground transition">
                                                                download
                                                            </span>
                                                        </a>
                                                    ) : (
                                                        <button
                                                            onClick={() => setPlayingMedia({
                                                                type: item.type as "audio" | "video",
                                                                file: item.file,
                                                                title: item.title
                                                            })}
                                                            className="w-full flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group text-left cursor-pointer"
                                                        >
                                                            <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                                {getContentIcon(item.type)}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-foreground font-medium truncate">
                                                                    {item.title}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {item.type === "audio" ? "Audio" : "Video"}
                                                                </p>
                                                            </div>
                                                            <span className="material-symbols-outlined text-muted-foreground transition">
                                                                {playingMedia?.file === item.file ? "pause_circle" : "play_circle"}
                                                            </span>
                                                        </button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Spacer for fixed audio player */}
                    {playingMedia?.type === "audio" && <div className="h-24" />}
                </div>

                {/* Audio Player - fixed at bottom */}
                {playingMedia?.type === "audio" && (
                    <AudioPlayer
                        src={playingMedia.file}
                        title={playingMedia.title}
                        onClose={() => setPlayingMedia(null)}
                    />
                )}

                {/* Video Player - modal overlay (legacy local files) */}
                {playingMedia?.type === "video" && (
                    <div
                        onClick={(e) => e.target === e.currentTarget && setPlayingMedia(null)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <div className="relative w-full max-w-5xl mx-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-red-400">play_circle</span>
                                    <h3 className="text-white font-medium truncate">{playingMedia.title}</h3>
                                </div>
                                <button
                                    onClick={() => setPlayingMedia(null)}
                                    className="p-2 hover:bg-white/10 rounded-full transition"
                                    title="Cerrar (Esc)"
                                >
                                    <span className="material-symbols-outlined text-white">close</span>
                                </button>
                            </div>
                            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                                <video
                                    src={playingMedia.file}
                                    controls
                                    autoPlay
                                    className="w-full h-full"
                                    controlsList="nodownload"
                                >
                                    Tu navegador no soporta el elemento de video.
                                </video>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Render dynamic Firestore content
    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Back button */}
                <Link
                    href="/cursos"
                    className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Volver a cursos
                </Link>

                {/* Course header */}
                <header className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-4">
                        {courseTitle}
                    </h1>
                </header>

                {/* Sections */}
                {sections.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-sage/30 rounded-xl">
                        <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-2">folder_open</span>
                        <p className="text-muted-foreground">Este curso aún no tiene contenido.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sections.map((section, sectionIndex) => (
                            <div
                                key={section.id}
                                className="border border-sage/20 rounded-xl overflow-hidden bg-surface"
                            >
                                {/* Section header - clickable */}
                                <button
                                    onClick={() => toggleStage(sectionIndex)}
                                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-desert-sand/20 dark:bg-sage/15 hover:bg-desert-sand/30 dark:hover:bg-sage/20 transition"
                                >
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">
                                            {section.title}
                                        </h2>
                                    </div>
                                    <span className={`material-symbols-outlined text-muted-foreground transition-transform ${expandedStages.has(sectionIndex) ? "rotate-180" : ""}`}>
                                        expand_more
                                    </span>
                                </button>

                                {/* Section content */}
                                {expandedStages.has(sectionIndex) && (
                                    <div className="border-t border-sage/10">
                                        {sectionItems[section.id]?.length === 0 ? (
                                            <div className="p-6 text-center text-muted-foreground">
                                                Esta sección no tiene contenido.
                                            </div>
                                        ) : (
                                            <ul className="divide-y divide-sage/10">
                                                {sectionItems[section.id]?.map((item) => (
                                                    <li key={item.id}>
                                                        {/* Image - display inline */}
                                                        {item.type === "image" && (
                                                            <div className="p-4">
                                                                <p className="text-foreground font-medium mb-3">{item.title}</p>
                                                                <div className="relative rounded-xl overflow-hidden bg-sage/10">
                                                                    <Image
                                                                        src={item.file_url}
                                                                        alt={item.title}
                                                                        width={800}
                                                                        height={450}
                                                                        className="w-full h-auto object-contain"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Document - download link */}
                                                        {item.type === "document" && (
                                                            <a
                                                                href={item.file_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group cursor-pointer"
                                                            >
                                                                <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                                    {getContentIcon(item.type)}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-foreground font-medium truncate">
                                                                        {item.title}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Documento
                                                                    </p>
                                                                </div>
                                                                <span className="material-symbols-outlined text-muted-foreground transition">
                                                                    download
                                                                </span>
                                                            </a>
                                                        )}

                                                        {/* Audio - opens AudioPlayer */}
                                                        {item.type === "audio" && (
                                                            <button
                                                                onClick={() => setPlayingMedia({
                                                                    type: "audio",
                                                                    file: item.file_url,
                                                                    title: item.title
                                                                })}
                                                                className="w-full flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group text-left cursor-pointer"
                                                            >
                                                                <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                                    {getContentIcon(item.type)}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-foreground font-medium truncate">
                                                                        {item.title}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Audio
                                                                    </p>
                                                                </div>
                                                                <span className="material-symbols-outlined text-muted-foreground transition">
                                                                    {playingMedia?.file === item.file_url ? "pause_circle" : "play_circle"}
                                                                </span>
                                                            </button>
                                                        )}

                                                        {/* Video - opens Video Player (Mux or Standard) */}
                                                        {item.type === "video" && (
                                                            <button
                                                                onClick={() => setPlayingMedia({
                                                                    type: item.mux_playback_id ? "mux-video" : "video",
                                                                    file: item.file_url,
                                                                    title: item.title,
                                                                    muxPlaybackId: item.mux_playback_id
                                                                })}
                                                                className="w-full flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group text-left cursor-pointer"
                                                            >
                                                                <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                                    {getContentIcon(item.type)}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-foreground font-medium truncate">
                                                                        {item.title}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Video
                                                                    </p>
                                                                </div>
                                                                <span className="material-symbols-outlined text-muted-foreground transition">
                                                                    play_circle
                                                                </span>
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Spacer for fixed audio player */}
                {playingMedia?.type === "audio" && <div className="h-24" />}
            </div>

            {/* Audio Player - fixed at bottom */}
            {playingMedia?.type === "audio" && (
                <AudioPlayer
                    src={playingMedia.file}
                    title={playingMedia.title}
                    onClose={() => setPlayingMedia(null)}
                />
            )}

            {/* Mux Video Player - modal overlay */}
            {playingMedia?.type === "mux-video" && playingMedia.muxPlaybackId && (
                <MuxVideoPlayer
                    playbackId={playingMedia.muxPlaybackId}
                    title={playingMedia.title}
                    onClose={() => setPlayingMedia(null)}
                />
            )}

            {/* Standard Video Player - modal overlay */}
            {playingMedia?.type === "video" && (
                <SimpleVideoPlayer
                    src={playingMedia.file}
                    title={playingMedia.title}
                    onClose={() => setPlayingMedia(null)}
                />
            )}
        </div>
    );
}
