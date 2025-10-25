"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { NextActivityCard } from "@/components/panel/NextActivityCard";
import { QuickActionButton } from "@/components/panel/QuickActionButton";
import { PhaseTab } from "@/components/panel/PhaseTab";
import { VideoCard } from "@/components/panel/VideoCard";
import { VideoPlayer } from "@/components/panel/VideoPlayer";
import { ScheduleSessionModal } from "@/components/panel/ScheduleSessionModal";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, updateDoc, doc } from "firebase/firestore";
import { Video as VideoType, UserVideoProgress, COLLECTIONS } from "@/lib/firestore-schema";

interface Session {
  id: string;
  user_id: string;
  day: Timestamp;
  time: string;
  duration: number;
  status: string;
  coach: string;
  stage: string;
  title: string;
}

export default function PanelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedPhase, setSelectedPhase] = useState(1);
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | null>(null);
  const [videoProgress, setVideoProgress] = useState<Record<string, UserVideoProgress>>({});
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Fetch videos from Firestore
  const fetchVideos = useCallback(async () => {
    console.log("🎬 Starting to fetch videos...");
    setLoadingVideos(true);
    try {
      const videosRef = collection(db, COLLECTIONS.VIDEOS);
      console.log("📁 Collection reference:", COLLECTIONS.VIDEOS);
      
      const q = query(
        videosRef,
        where("status", "==", "Publicado")
      );

      console.log("🔍 Executing query...");
      const snapshot = await getDocs(q);
      console.log("📊 Query results:", snapshot.size, "documents");
      
      const loadedVideos: VideoType[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date_added: doc.data().date_added?.toDate() || new Date(),
      } as VideoType));

      console.log("📹 Loaded videos:", loadedVideos);

      // Sort client-side by phase and order
      loadedVideos.sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase;
        return a.order - b.order;
      });

      console.log("✅ Setting videos state with", loadedVideos.length, "videos");
      setVideos(loadedVideos);
    } catch (error) {
      console.error("❌ Error fetching videos:", error);
      setVideos([]);
    } finally {
      setLoadingVideos(false);
      console.log("🏁 Finished fetching videos");
    }
  }, []);

  // Fetch user video progress
  const fetchVideoProgress = useCallback(async () => {
    if (!user) return;

    try {
      const progressRef = collection(db, COLLECTIONS.USER_VIDEO_PROGRESS);
      const q = query(progressRef, where("user_id", "==", user.uid));

      const snapshot = await getDocs(q);
      const progress: Record<string, UserVideoProgress> = {};
      snapshot.forEach((docItem) => {
        const data = docItem.data() as UserVideoProgress;
        progress[data.video_id] = {
          ...data,
          id: docItem.id,
          last_watched: data.last_watched,
        };
      });

      setVideoProgress(progress);
    } catch (error) {
      console.error("Error fetching video progress:", error);
    }
  }, [user]);

  // Save video progress
  const handleVideoProgress = async (videoId: string, watchedSeconds: number, progressPercentage: number) => {
    if (!user) return;

    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    const isCompleted = progressPercentage >= 90;

    try {
      const existingProgress = videoProgress[videoId];

      if (existingProgress) {
        // Update existing progress
        const progressDoc = doc(db, COLLECTIONS.USER_VIDEO_PROGRESS, existingProgress.id);
        await updateDoc(progressDoc, {
          watched_seconds: watchedSeconds,
          progress_percentage: progressPercentage,
          completed: isCompleted,
          last_watched: Timestamp.now(),
          ...(isCompleted && !existingProgress.completed ? { completed_date: Timestamp.now() } : {}),
        });
      } else {
        // Create new progress record
        await addDoc(collection(db, COLLECTIONS.USER_VIDEO_PROGRESS), {
          user_id: user.uid,
          video_id: videoId,
          watched_seconds: watchedSeconds,
          total_duration: video.duration,
          progress_percentage: progressPercentage,
          completed: isCompleted,
          last_watched: Timestamp.now(),
          ...(isCompleted ? { completed_date: Timestamp.now() } : {}),
        });
      }

      // Refresh progress
      await fetchVideoProgress();
    } catch (error) {
      console.error("Error saving video progress:", error);
    }
  };

  // Fetch all upcoming scheduled sessions
  const fetchUpcomingSessions = useCallback(async () => {
    if (!user) return;
    
    setLoadingSessions(true);
    try {
      const now = Timestamp.now();
      const sessionsRef = collection(db, "sessions");
      const q = query(
        sessionsRef,
        where("user_id", "==", user.uid),
        where("status", "==", "scheduled"),
        where("day", ">=", now),
        orderBy("day", "asc")
      );

      const snapshot = await getDocs(q);
      const sessions: Session[] = [];
      snapshot.forEach((docItem) => {
        sessions.push({ id: docItem.id, ...docItem.data() } as Session);
      });
      setUpcomingSessions(sessions);
    } catch (error: unknown) {
      // Handle index not ready or collection doesn't exist yet
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "failed-precondition"
      ) {
        console.log("Firestore index is being created. Sessions will appear once ready.");
      } else if (typeof error === "object" && error !== null && "message" in error) {
        const message = (error as { message?: string }).message ?? "";
        if (message.includes("index")) {
          console.log("Firestore index is being created. Sessions will appear once ready.");
        } else {
          console.error("Error fetching sessions:", error);
        }
      } else {
        console.error("Error fetching sessions:", error);
      }
      setUpcomingSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchVideos();
      fetchVideoProgress();
      fetchUpcomingSessions();
    }
  }, [fetchUpcomingSessions, fetchVideoProgress, fetchVideos, user]);

  const formatSessionTime = (session: Session) => {
    const date = session.day.toDate();
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const dayName = dayNames[date.getDay()];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    
    return `${dayName} ${day} ${month}, ${session.time}`;
  };

  // Helper function to format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Group videos by phase
  const videosByPhase = videos.reduce((acc, video) => {
    if (!acc[video.phase]) {
      acc[video.phase] = [];
    }
    acc[video.phase].push(video);
    return acc;
  }, {} as Record<number, VideoType[]>);

  // Get unique phases from videos
  const phases = Object.keys(videosByPhase).map(Number).sort((a, b) => a - b);
  
  // Get current phase videos
  const currentPhaseVideos = videosByPhase[selectedPhase] || [];

  // Phase titles mapping
  const phaseTitles: Record<number, string> = {
    1: "Fase 1: Reset Integral",
    2: "Fase 2: Regenerativa",
    3: "Fase 3: Mi Nuevo Sentir",
    4: "Fase 4: Transformación Sostenible",
  };

  // Phase images mapping  
  const phaseImages: Record<number, string> = {
    1: "https://lh3.googleusercontent.com/aida-public/AB6AXuCgfOaQ7g0I96xmkbGtyG08buzx7ird0-EKBGBylXBqyblFqU_BwtCKa3mDkSAYNFEoaWJtHc1khnfXmDHE7_UmaVoNFi3Uz0NUDjJIDp5fzgLwxKY5l_5QX_8eei1QNDLIbcvUWRYcZv6b9g5ispzzRAyqRY34_yXj7CAHWJCqHPH-GH6GZcHprg0oZ9gIQ98wgJDLpeKXAunts9BeeMiGTUReEni-_F6MHzlAsYvqozUgQm49IQi8Z1zd0Hn2lqfSytoCFABwfQ",
    2: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrg3jTg70_rOhFdHViWf6kEwo8hDesi9hVlvAMy5_j6sWUXD3SkghbmTfjdRCwWIa20nPFZt1MFDzh0U4_Q7LryNE_nkUcd8ZbNAFtblZfT-qurxhFCW_-0WzTzkxvMRo0jUxBYZZ-C-vqpJSCIs1atsfBj4ffOgY-dhcBUPWg-qdrhTEJJJKPJRX48cIenGdu-5XaTzbj3grxojKWXD8dpgTI-forkGkPLLDNRRWifFqUfvMMcTg7qaZpUblMHA7lnrQsRNGxAg",
    3: "https://lh3.googleusercontent.com/aida-public/AB6AXuCmV1mI9QLaTjZJMUfAt0durOXOyyoxW9CJgHa8bLSRdDbBvt3cfu72JATadatYf6FQAmNMJvwBCg2TF6N-HNFgE9zajFlaZ8SreBOT7KFyLoc-6HHmjp4meFSdK5VgCieFUVQIYTRWMlmjZjzEz2T6DhAYF-j3io6WPxqPpFUS-dnvTCwHDnv4oXOXzn0ceHGePRvpKoV8vOQtqZQnosCqnVp3U5aXDnJg_-3W38mBDOv4tm7p7MDPe03ktSUrNbL6e6HnBzRzsw",
    4: "https://lh3.googleusercontent.com/aida-public/AB6AXuCA4BN3XKQAv4z29K1fDub9JZcYfoHG8SZOLX0pN_VEsWM2YkpZ_VHVW0ndLJLw4ktEBxP7zaOyAK6xxj6YCePrfr5OJlOiV1hRmXfkZUuHVNTE8zeHjrz7_jHxJ8QdRINzrtm1N2tqpjfpu3BhDbYroTNbAWZE25bv7B8Mw-SraUQdYa4EHfhcNiaAU8MovL_WeyCr-oHNZe_c4MmB1fMIkwBIDVPnLnhnbgt9lFD6UUuzV5bJ_0M133rxZlg8PDr4yODNu9cWzg",
  };

  // Calculate progress per phase (percentage of completed videos)
  const calculatePhaseProgress = (phase: number): number => {
    const phaseVideos = videosByPhase[phase] || [];
    if (phaseVideos.length === 0) return 0;
    const completedCount = phaseVideos.filter(v => videoProgress[v.id]?.completed).length;
    return Math.round((completedCount / phaseVideos.length) * 100);
  };

  const handleSessionScheduled = () => {
    // Refresh the sessions list
    fetchUpcomingSessions();
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Get user's first name from email or displayName
  const firstName = user.displayName?.split(" ")[0] || user.email?.split("@")[0] || "Usuario";

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1024px] flex-col px-2 py-8 sm:px-10">
        <h1 className="mb-6 text-3xl font-black text-panel-text">Hola, {firstName}</h1>

        {/* Next Activities */}
        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-panel-text">Próximas Actividades</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {loadingSessions ? (
              <div className="rounded-xl border border-panel-border bg-panel-card p-4 text-center text-panel-muted">
                Cargando sesiones programadas...
              </div>
            ) : upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => (
                <NextActivityCard
                  key={session.id}
                  icon="groups"
                  title={`Sesión ${session.coach}`}
                  time={formatSessionTime(session)}
                  hasSession={true}
                />
              ))
            ) : (
              <NextActivityCard
                icon="groups"
                title="Sesión 1-on-1"
                hasSession={false}
                onSchedule={() => setIsScheduleModalOpen(true)}
              />
            )}
            <NextActivityCard
              icon="self_improvement"
              title="Meditación"
              time="Hoy, 8:00 PM"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
        {/* <h2 className="mb-4 text-2xl font-bold text-panel-text">Diario</h2> */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <QuickActionButton
              icon="edit_note"
              label="Diario"
              onClick={() => router.push("/journal")}
            />
            <QuickActionButton
              icon="scale"
              label="Registrar peso/altura"
              onClick={() => {
                // TODO: Open weight logging modal
                console.log("Log weight");
              }}
            />
            <QuickActionButton
              icon="spa"
              label="Meditación Diaria"
              onClick={() => router.push("/meditar")}
            />
          </div>
        </div>


    {/* Phase Tabs */}
        <div className="mb-8">
          {/* <h2 className="mb-4 text-2xl font-bold text-panel-text">Fases del Programa</h2> */}
          <div className="grid grid-flow-row lg:grid-flow-col gap-2 rounded-3xl">
            {phases.map((phaseNumber) => (
              <PhaseTab
                key={phaseNumber}
                imageUrl={phaseImages[phaseNumber] || ""}
                title={phaseTitles[phaseNumber] || `Fase ${phaseNumber}`}
                progress={calculatePhaseProgress(phaseNumber)}
                isSelected={selectedPhase === phaseNumber}
                onClick={() => setSelectedPhase(phaseNumber)}
              />
            ))}
          </div>
        </div>


        {/* Videos Section - Changes based on selected phase */}
        <div>
          <h2 className="mb-4 text-2xl font-bold text-panel-text">
            {phaseTitles[selectedPhase] || `Fase ${selectedPhase}`} - Videos
          </h2>
          {loadingVideos ? (
            <div className="text-panel-muted">Cargando videos...</div>
          ) : currentPhaseVideos.length === 0 ? (
            <div className="text-panel-muted">No hay videos disponibles para esta fase.</div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {currentPhaseVideos.map((video: VideoType) => (
                <VideoCard
                  key={video.id}
                  title={video.title}
                  description={video.description}
                  duration={formatDuration(video.duration)}
                  imageUrl={video.thumbnail_url}
                  isCompleted={videoProgress[video.id]?.completed || false}
                  onClick={() => setSelectedVideo(video)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Session Modal */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSessionScheduled={handleSessionScheduled}
      />

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          onClose={() => setSelectedVideo(null)}
          onProgress={handleVideoProgress}
        />
      )}
    </div>
  );
}
