"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface Video {
  id: string;
  title: string;
  filename: string;
  thumbnail?: string;
}

const videos: Video[] = [
  {
    id: "1",
    title: "Qué es el Coaching de Nutrición",
    filename: "Que es el coaching de nutricion.mp4",
  },
  {
    id: "2",
    title: "Qué es el Coaching Transpersonal",
    filename: "Que es el coaching transpersonal.mp4",
  },
  {
    id: "3",
    title: "Qué es la Dieta Mediterránea",
    filename: "Que es la dieta mediterranea.mp4",
  },
  {
    id: "4",
    title: "Qué es la Meditación Trascendental",
    filename: "Que es la meditacion trascendental.mp4",
  },
  {
    id: "5",
    title: "Qué es la Meditación",
    filename: "Que es la meditacion.mp4",
  },
];

export default function VideosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      if (video) {
        setCurrentTime(video.currentTime);
      }
    };

    const updateDuration = () => {
      if (video && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    const handleEnded = () => setIsPlaying(false);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("loadedmetadata", updateDuration);
    video.addEventListener("ended", handleEnded);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("loadedmetadata", updateDuration);
      video.removeEventListener("ended", handleEnded);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [selectedVideo]);

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (videoRef.current) {
      videoRef.current.src = `/videos/${encodeURIComponent(video.filename)}`;
      videoRef.current.load();
    }
  };

  const togglePlayPause = async () => {
    if (!videoRef.current || !selectedVideo) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing video:", error);
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
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
      <div className="mx-auto flex max-w-[1400px] flex-col px-2 py-8 sm:px-10">
        <h1 className="pb-8 text-left text-3xl font-bold leading-tight tracking-tight text-panel-text sm:text-4xl">
          Videos
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-panel-border bg-panel-card p-4 sm:p-8">
              {selectedVideo ? (
                <div className="space-y-6">
                  {/* Video Player */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
                    <video
                      ref={videoRef}
                      className="h-full w-full"
                      onClick={togglePlayPause}
                    />

                    {/* Play/Pause Overlay */}
                    {!isPlaying && (
                      <div
                        onClick={togglePlayPause}
                        className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/40 transition-opacity hover:bg-black/50"
                      >
                        <span className="material-symbols-outlined text-8xl text-white drop-shadow-lg">
                          play_circle
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div>
                    <h3 className="text-2xl font-bold text-panel-text">{selectedVideo.title}</h3>
                  </div>

                  {/* Controls */}
                  <div className="space-y-3">
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

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = Math.max(0, currentTime - 10);
                            }
                          }}
                          className="rounded-full p-2 text-panel-text transition-colors hover:bg-panel-border"
                        >
                          <span className="material-symbols-outlined text-2xl">replay_10</span>
                        </button>

                        <button
                          onClick={togglePlayPause}
                          className="rounded-full bg-panel-primary p-3 text-white transition-opacity hover:opacity-90"
                        >
                          <span className="material-symbols-outlined text-4xl">
                            {isPlaying ? "pause" : "play_arrow"}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.currentTime = Math.min(duration, currentTime + 10);
                            }
                          }}
                          className="rounded-full p-2 text-panel-text transition-colors hover:bg-panel-border"
                        >
                          <span className="material-symbols-outlined text-2xl">forward_10</span>
                        </button>
                      </div>

                      <button
                        onClick={toggleFullscreen}
                        className="rounded-full p-2 text-panel-text transition-colors hover:bg-panel-border"
                      >
                        <span className="material-symbols-outlined text-2xl">
                          {isFullscreen ? "fullscreen_exit" : "fullscreen"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-panel-border/30">
                  <div className="text-center">
                    <span className="material-symbols-outlined mb-4 text-6xl text-panel-muted">
                      play_circle
                    </span>
                    <p className="text-xl text-panel-muted">Selecciona un video para comenzar</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Video Grid */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 text-xl font-bold text-panel-text">Lista de Videos</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {videos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => handleVideoSelect(video)}
                  className={`group flex cursor-pointer flex-col gap-3 overflow-hidden rounded-lg border bg-panel-card shadow-sm transition-all hover:shadow-lg ${
                    selectedVideo?.id === video.id
                      ? "border-panel-primary ring-2 ring-panel-primary ring-opacity-50"
                      : "border-panel-border hover:border-panel-primary"
                  }`}
                >
                  <div className="relative aspect-video w-full bg-panel-border/30">
                    {/* Video thumbnail placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-5xl text-panel-muted group-hover:text-panel-primary">
                        {selectedVideo?.id === video.id && isPlaying
                          ? "pause_circle"
                          : "play_circle"}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <p
                      className={`text-base font-semibold leading-snug ${
                        selectedVideo?.id === video.id
                          ? "text-panel-primary"
                          : "text-panel-text"
                      }`}
                    >
                      {video.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
