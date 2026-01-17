"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { getUserProfile } from "@/lib/firestore-helpers";
import type { User } from "@/lib/firestore-schema";
import AudioPlayer from "@/components/common/AudioPlayer";
import VideoPlayer from "@/components/common/VideoPlayer";

// Course content mapping - maps course IDs to their content folders and stages
interface CourseStage {
    title: string;
    content: CourseContent[];
}

interface CourseContent {
    type: "video" | "audio" | "pdf";
    title: string;
    file: string;
}

interface CourseData {
    id: string;
    title: string;
    description: string;
    stages: CourseStage[];
}

// Currently playing media state
interface PlayingMedia {
    type: "audio" | "video";
    file: string;
    title: string;
}

// Depuracion de Cortisol course data
const CORTISOL_COURSE: CourseData = {
    id: "cortisol",
    title: "Depuración de Cortisol",
    description: "Un programa completo para regular tu cortisol y recuperar tu bienestar a través del sueño, la alimentación y técnicas de relajación.",
    stages: [
        {
            title: "Introducción",
            content: [
                { type: "video", title: "Video de Bienvenida", file: "/cursos/cortisol/0.1.0Video1.mp4" },
                { type: "audio", title: "Introducción al Programa", file: "/cursos/cortisol/0.2.0 Introducción .m4a" },
            ]
        },
        {
            title: "Etapa 1: Sueño y Ritmo Circadiano",
            content: [
                { type: "audio", title: "Eje 1: Sueño y Ritmo Circadiano", file: "/cursos/cortisol/1.1.0 Eje 1. Sueño y ritmo circadiano.m4a" },
                { type: "audio", title: "Sueño y Ritmo Circadiano - Video 2", file: "/cursos/cortisol/1.1.0 Sueño y ritmo circadiano. Video 2.m4a" },
                { type: "pdf", title: "Regulación del Sueño - Instrucciones", file: "/cursos/cortisol/1.2.0 Regulación del sueño. instrucciones.pdf" },
                { type: "pdf", title: "Regulación del Sueño - Tablas", file: "/cursos/cortisol/1.2.1 Regulación del sueño. tablas.pdf" },
            ]
        },
        {
            title: "Etapa 2: Alimentación e Hidratación",
            content: [
                { type: "audio", title: "Alimentación Energética", file: "/cursos/cortisol/2.1.0 Alimentación energetica.m4a" },
                { type: "audio", title: "Alimentación - Estructura", file: "/cursos/cortisol/2.2.0 Alimentación. Estructura.m4a" },
                { type: "audio", title: "Eje 2: Hidratación", file: "/cursos/cortisol/2.3.0 Eje 2. Hidratacion.m4a" },
                { type: "audio", title: "Eje 2: Complementos", file: "/cursos/cortisol/2.4.0 Eje 2. Complementos.m4a" },
                { type: "pdf", title: "Detox del Cortisol - Recetas Ritual", file: "/cursos/cortisol/2.5.0 Detox del cortisol. recetas ritual.pdf" },
                { type: "pdf", title: "Recetas de Desayunos", file: "/cursos/cortisol/2.6.0 Alimentacion. Recetas de desayunos.pdf" },
                { type: "pdf", title: "Recomendaciones para una Hidratación Correcta", file: "/cursos/cortisol/2.7.0 Alimentacion. recomendaciones para una hidratacion correcta.pdf" },
            ]
        },
        {
            title: "Etapa 3: Pranayama y Meditación",
            content: [
                { type: "audio", title: "Pranayama y Meditación", file: "/cursos/cortisol/3.1.0  Pranayama y meditación.m4a" },
            ]
        }
    ]
};

// Map of course IDs to their data
const COURSES_MAP: Record<string, CourseData> = {
    "cortisol": CORTISOL_COURSE,
};

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set([0]));
    const [playingMedia, setPlayingMedia] = useState<PlayingMedia | null>(null);

    const courseId = params.courseId as string;
    const courseData = COURSES_MAP[courseId];

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const userProfile = await getUserProfile(user.uid);
                setProfile(userProfile);
            } catch (error) {
                console.error("Error fetching user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            fetchProfile();
        }
    }, [user, authLoading]);

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

    const getContentIcon = (type: CourseContent["type"]) => {
        switch (type) {
            case "video": return "play_circle";
            case "audio": return "headphones";
            case "pdf": return "description";
            default: return "insert_drive_file";
        }
    };

    const getContentColor = (type: CourseContent["type"]) => {
        switch (type) {
            case "video": return "text-red-500";
            case "audio": return "text-blue-500";
            case "pdf": return "text-amber-600";
            default: return "text-muted-foreground";
        }
    };

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

    if (!courseData) {
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
                        {courseData.title}
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        {courseData.description}
                    </p>
                </header>

                {/* Stages */}
                <div className="space-y-4">
                    {courseData.stages.map((stage, stageIndex) => (
                        <div
                            key={stageIndex}
                            className="border border-sage/20 rounded-xl overflow-hidden bg-surface"
                        >
                            {/* Stage header - clickable */}
                            <button
                                onClick={() => toggleStage(stageIndex)}
                                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-sage/5 transition"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${stageIndex === 0
                                        ? "bg-primary/10 text-primary"
                                        : "bg-sage/20 text-foreground"
                                        }`}>
                                        {stageIndex === 0 ? "★" : stageIndex}
                                    </div>
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
                                <div className="border-t border-sage/10">
                                    <ul className="divide-y divide-sage/10">
                                        {stage.content.map((item, contentIndex) => (
                                            <li key={contentIndex}>
                                                {item.type === "pdf" ? (
                                                    // PDFs still open in new tab
                                                    <a
                                                        href={item.file}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group"
                                                    >
                                                        <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                            {getContentIcon(item.type)}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-foreground font-medium group-hover:text-primary transition truncate">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Documento PDF
                                                            </p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-muted-foreground group-hover:text-primary transition">
                                                            download
                                                        </span>
                                                    </a>
                                                ) : (
                                                    // Video and Audio trigger in-page players
                                                    <button
                                                        onClick={() => setPlayingMedia({
                                                            type: item.type as "audio" | "video",
                                                            file: item.file,
                                                            title: item.title
                                                        })}
                                                        className="w-full flex items-center gap-4 p-4 sm:px-5 hover:bg-sage/5 transition group text-left"
                                                    >
                                                        <span className={`material-symbols-outlined text-2xl ${getContentColor(item.type)}`}>
                                                            {getContentIcon(item.type)}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-foreground font-medium group-hover:text-primary transition truncate">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {item.type === "audio" ? "Audio" : "Video"}
                                                            </p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-muted-foreground group-hover:text-primary transition">
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

            {/* Video Player - modal overlay */}
            {playingMedia?.type === "video" && (
                <VideoPlayer
                    src={playingMedia.file}
                    title={playingMedia.title}
                    onClose={() => setPlayingMedia(null)}
                />
            )}
        </div>
    );
}
