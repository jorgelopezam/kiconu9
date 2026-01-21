"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { getAllCourses, getUserProfile } from "@/lib/firestore-helpers";
import type { Course, User } from "@/lib/firestore-schema";

// Maps course titles to URL slugs for the detail pages
const COURSE_SLUG_MAP: Record<string, string> = {
    "Depuración de Cortisol": "cortisol",
    "Depuracion de Cortisol": "cortisol",
};

const COURSE_IMAGE_MAP: Record<string, string> = {
    "Depuración de Cortisol": "/cursos/cortisol/thumbnail.webp",
    "Depuracion de Cortisol": "/cursos/cortisol/thumbnail.webp",
};

function getCourseSlug(title: string): string | null {
    return COURSE_SLUG_MAP[title] || null;
}

export default function CursosPage() {
    const { user, loading: authLoading } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [profile, setProfile] = useState<User | null>(null);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                const [allCourses, userProfile] = await Promise.all([
                    getAllCourses(),
                    getUserProfile(user.uid)
                ]);
                setCourses(allCourses.filter(c => c.status === "active"));
                setProfile(userProfile);
            } catch (error) {
                console.error("Error fetching cursos data:", error);
            } finally {
                setLoadingCourses(false);
            }
        };

        if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    const accessibleCourses = useMemo(() => {
        if (!profile) return [];

        // Admins see everything
        if (profile.is_admin) return courses;

        return courses.filter(course => {
            // 1. Restricted access (check if user is explicitly assigned)
            if (course.access_level === "restricted") {
                return profile.course_access?.includes(course.id);
            }

            // 2. "all" access
            if (course.access_level === "all") return true;

            // 3. User type hierarchy
            const levels = ["base", "kiconu", "premium"];
            const userLevelIndex = levels.indexOf(profile.user_type || "");
            const courseLevelIndex = levels.indexOf(course.access_level);

            // If user_type is not in the list (e.g. null), they don't see level-based courses
            if (userLevelIndex === -1) return false;

            // User sees courses at their level or below
            return userLevelIndex >= courseLevelIndex;
        });
    }, [courses, profile]);

    const handleThumbnailClick = (course: Course) => {
        if (course.intro_video_url) {
            setPlayingVideoUrl(course.intro_video_url);
        }
    };

    if (authLoading || loadingCourses) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="text-foreground animate-pulse">Cargando contenido...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen relative">
            {/* Video Modal */}
            {playingVideoUrl && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                    onClick={() => setPlayingVideoUrl(null)}
                >
                    <div
                        className="relative w-full max-w-4xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setPlayingVideoUrl(null)}
                            className="absolute -top-12 right-0 p-2 text-white hover:text-primary transition"
                        >
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                        <video
                            src={playingVideoUrl}
                            controls
                            autoPlay
                            className="w-full rounded-2xl shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Background Image - Fixed to cover full screen despite layout constraints */}
            <div className="fixed inset-0 z-0">
                <Image
                    src="/cursos/backgroundCursos.png"
                    alt="Fondo Cursos"
                    fill
                    className="object-cover opacity-40"
                    priority
                />
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Profile Completion Banner */}
                {profile && (!profile.age || !profile.height || !profile.weight || !profile.gender) && (
                    <div className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="flex items-start gap-3 flex-1">
                                <span className="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400 flex-shrink-0">info</span>
                                <div>
                                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                        Completa tus datos para mejorar tu experiencia Kiconu
                                    </p>
                                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                                        Algunos datos de tu perfil están incompletos. Completar tu información nos permite personalizar mejor tu experiencia.
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/cuenta"
                                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 whitespace-nowrap"
                            >
                                Completar perfil
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                )}

                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        Mis Cursos & Contenido
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                        Explora el contenido exclusivo diseñado para tu transformación.
                    </p>
                </header>

                {accessibleCourses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sage/30 bg-surface/50 p-12 text-center">
                        <span className="material-symbols-outlined text-6xl text-sage/40 mb-4">school</span>
                        <h3 className="text-xl font-semibold text-foreground">No tienes cursos asignados aún</h3>
                        <p className="mt-2 text-muted-foreground">
                            Pronto verás aquí el contenido disponible para tu nivel.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                        {accessibleCourses.map((course) => (
                            <div
                                key={course.id}
                                className="group relative flex flex-col overflow-hidden rounded-2xl border border-sage/20 bg-surface shadow-sm transition-all hover:shadow-md hover:-translate-y-1"
                            >
                                <div
                                    className={`aspect-video bg-desert-sand/10 flex items-center justify-center relative overflow-hidden ${course.intro_video_url ? 'cursor-pointer' : ''}`}
                                    onClick={() => handleThumbnailClick(course)}
                                >
                                    {(course.thumbnail_url || COURSE_IMAGE_MAP[course.title]) ? (
                                        <Image
                                            src={course.thumbnail_url || COURSE_IMAGE_MAP[course.title]}
                                            alt={course.title}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <span className="material-symbols-outlined text-5xl text-primary/20 transition-transform group-hover:scale-110">
                                            play_circle
                                        </span>
                                    )}
                                    {/* Play button overlay for courses with intro video */}
                                    {course.intro_video_url && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-5xl text-white drop-shadow-lg">
                                                play_circle
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col p-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${course.access_level === "restricted"
                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                            : course.access_level === "premium"
                                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                                : course.access_level === "kiconu"
                                                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                                    : "bg-sage/20 text-foreground"
                                            }`}>
                                            {course.access_level === "restricted" ? "Especial" : course.access_level.toUpperCase()}
                                        </span>
                                    </div>
                                    <h2 className="text-xl font-bold text-foreground mb-4">
                                        {course.title}
                                    </h2>
                                    <Link
                                        href={`/cursos/${course.id}`}
                                        className="mt-auto w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white text-center transition hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary/40 block"
                                    >
                                        Acceder al curso
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

