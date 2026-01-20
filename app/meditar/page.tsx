"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getMeditations } from "@/lib/firestore-helpers";
import type { Meditation } from "@/lib/firestore-schema";
import AudioPlayer from "@/components/media/AudioPlayer";

export default function MeditarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [meditations, setMeditations] = useState<Meditation[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Meditation | null>(null);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      fetchMeditations();
    }
  }, [user, loading, router]);

  const fetchMeditations = async () => {
    try {
      const data = await getMeditations();
      // Sort by duration ascending (shortest first)
      data.sort((a, b) => (a.duration || 0) - (b.duration || 0));
      setMeditations(data);
    } catch (error) {
      console.error("Error fetching meditations:", error);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  if (loading || isLoadingTracks) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-panel-bg">
        <div className="text-panel-text">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-panel-bg pb-24">
      <div className="mx-auto flex max-w-[1024px] flex-col px-4 py-8 sm:px-10">
        <h1 className="pb-8 text-left text-3xl font-bold leading-tight tracking-tight text-panel-text sm:text-4xl">
          Meditaciones
        </h1>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meditations.length === 0 ? (
            <div className="col-span-full py-12 text-center text-panel-muted">
              No hay meditaciones disponibles.
            </div>
          ) : (
            meditations.map((track) => (
              <button
                key={track.id}
                onClick={() => setCurrentTrack(track)}
                className={`group relative flex w-full flex-row items-center gap-4 overflow-hidden rounded-xl border p-4 text-left transition-all hover:scale-[1.01] hover:shadow-md ${currentTrack?.id === track.id
                  ? "border-panel-primary bg-panel-primary/5 text-panel-primary shadow-sm"
                  : "border-panel-border bg-panel-card text-panel-text hover:border-panel-primary/50"
                  }`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors ${currentTrack?.id === track.id
                    ? "bg-panel-primary text-white"
                    : "bg-panel-primary/10 text-panel-primary group-hover:bg-panel-primary group-hover:text-white"
                    }`}>
                    <span className="material-symbols-outlined text-xl">
                      {currentTrack?.id === track.id ? "graphic_eq" : "play_arrow"}
                    </span>
                  </div>
                  {track.duration ? (
                    <span className="text-xs text-panel-muted font-medium">
                      {Math.floor(track.duration / 60)}:{Math.round(track.duration % 60).toString().padStart(2, '0')}
                    </span>
                  ) : <span className="h-4"></span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium leading-tight text-left">{track.title}</h3>
                </div>
              </button>
            ))
          )}
        </div>

        {currentTrack && (
          <AudioPlayer
            src={currentTrack.file_url}
            title={currentTrack.title}
            onClose={() => setCurrentTrack(null)}
          />
        )}
      </div>
    </div>
  );
}
