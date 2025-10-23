"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface MeditationTrack {
  id: string;
  title: string;
  filename: string;
}

const meditationTracks: MeditationTrack[] = [
  {
    id: "1",
    title: "Tuning in to New Potentials Meditation",
    filename: "Joe Dispenza - Tuning in to New Potentials Meditation_.mp3",
  },
  {
    id: "2",
    title: "Blessing Of The Energy Centers II",
    filename: "Joe Dispenza Meditation - Blessing Of The Energy Centers II.mp3",
  },
  {
    id: "3",
    title: "Blessing Of The Energy Centers - Becoming Supernatural",
    filename: "Joe Dispenza meditation - Blessing Of The Energy Centers BECOMING SUPERNATURAL.mp3",
  },
  {
    id: "4",
    title: "Pineal Gland Meditation",
    filename: "Pineal Gland Meditation  DR. Joe Dispenza.mp3",
  },
  {
    id: "5",
    title: "Meditación Transpersonal 1",
    filename: "meditacionTP1.mp3",
  },
];

export default function MeditarPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [selectedTrack, setSelectedTrack] = useState<MeditationTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      if (audio) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    const updateDuration = () => {
      if (audio && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [selectedTrack]);

  const handleTrackSelect = (track: MeditationTrack) => {
    setSelectedTrack(track);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    if (audioRef.current) {
      // Files are now in public/meditations folder
      audioRef.current.src = `/meditations/${encodeURIComponent(track.filename)}`;
      audioRef.current.load();
    }
  };

  const togglePlayPause = async () => {
    if (!audioRef.current || !selectedTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing audio:", error);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1024px] flex-col px-2 py-8 sm:px-10">
        <h1 className="pb-8 text-left text-3xl font-bold leading-tight tracking-tight text-panel-text sm:text-4xl">
          Meditaciones
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Track List */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 text-xl font-bold text-panel-text">Lista de Meditaciones</h2>
            <div className="space-y-2">
              {meditationTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleTrackSelect(track)}
                  className={`w-full rounded-lg border p-4 text-left transition-all ${
                    selectedTrack?.id === track.id
                      ? "border-panel-primary bg-panel-primary/10 text-panel-primary"
                      : "border-panel-border bg-panel-card text-panel-text hover:border-panel-primary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">
                      {selectedTrack?.id === track.id && isPlaying ? "pause_circle" : "play_circle"}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold">{track.title}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Audio Player */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-panel-border bg-panel-card p-8">
              {selectedTrack ? (
                <div className="space-y-6">
                  {/* Track Info */}
                  <div className="text-center">
                    <div className="mb-4 flex justify-center">
                      <div className="rounded-full bg-panel-primary/10 p-8">
                        <span className="material-symbols-outlined text-6xl text-panel-primary">
                          self_improvement
                        </span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-panel-text">{selectedTrack.title}</h3>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max={duration || 0}
                      value={currentTime}
                      onChange={handleSeek}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-panel-border accent-panel-primary"
                      style={{
                        background: `linear-gradient(to right, var(--panel-primary) 0%, var(--panel-primary) ${(currentTime / duration) * 100}%, var(--panel-border) ${(currentTime / duration) * 100}%, var(--panel-border) 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-sm text-panel-muted">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = Math.max(0, currentTime - 10);
                        }
                      }}
                      className="rounded-full p-3 text-panel-text transition-colors hover:bg-panel-border"
                    >
                      <span className="material-symbols-outlined text-3xl">replay_10</span>
                    </button>

                    <button
                      onClick={togglePlayPause}
                      className="rounded-full bg-panel-primary p-4 text-white transition-opacity hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-5xl">
                        {isPlaying ? "pause" : "play_arrow"}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = Math.min(duration, currentTime + 10);
                        }
                      }}
                      className="rounded-full p-3 text-panel-text transition-colors hover:bg-panel-border"
                    >
                      <span className="material-symbols-outlined text-3xl">forward_10</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <span className="material-symbols-outlined mb-4 text-6xl text-panel-muted">
                    headphones
                  </span>
                  <p className="text-xl text-panel-muted">
                    Selecciona una meditación para comenzar
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio ref={audioRef} className="hidden" />
      </div>
    </div>
  );
}
