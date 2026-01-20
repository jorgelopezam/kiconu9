"use client";

import { useState, useRef, useEffect } from "react";

interface AudioPlayerProps {
    src: string;
    title: string;
    onClose: () => void;
}

export default function AudioPlayer({ src, title, onClose }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
            setIsLoading(false);
            // Attempt to play when loaded (in case autoPlay prop doesn't trigger state sync purely)
            audio.play().catch(e => console.log("Autoplay prevented:", e));
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const time = parseFloat(e.target.value);
        audio.currentTime = time;
        setCurrentTime(time);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const skip = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = Math.min(Math.max(0, audio.currentTime + seconds), duration);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#f4f7f0] [.theme-dark_&]:bg-[#23251a] border-t border-sage/20 shadow-lg">
            <audio ref={audioRef} src={src} preload="metadata" autoPlay />

            <div className="max-w-4xl mx-auto px-4 py-3">
                {/* Title bar with close button */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-blue-500">headphones</span>
                        <span className="text-sm font-medium text-foreground truncate">{title}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                    {/* Skip back */}
                    <button
                        onClick={() => skip(-10)}
                        className="p-1 hover:bg-sage/10 rounded-full transition"
                        title="Retroceder 10s"
                    >
                        <span className="material-symbols-outlined text-foreground">replay_10</span>
                    </button>

                    {/* Play/Pause */}
                    <button
                        onClick={togglePlay}
                        disabled={isLoading}
                        className="w-12 h-12 flex items-center justify-center bg-primary rounded-full hover:bg-primary-600 transition disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-white text-2xl">
                            {isLoading ? "hourglass_empty" : isPlaying ? "pause" : "play_arrow"}
                        </span>
                    </button>

                    {/* Skip forward */}
                    <button
                        onClick={() => skip(10)}
                        className="p-1 hover:bg-sage/10 rounded-full transition"
                        title="Avanzar 10s"
                    >
                        <span className="material-symbols-outlined text-foreground">forward_10</span>
                    </button>

                    {/* Progress bar */}
                    <div className="flex-1 flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-10 text-right">
                            {formatTime(currentTime)}
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            className="flex-1 h-2 bg-sage/20 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-xs text-muted-foreground w-10">
                            {formatTime(duration)}
                        </span>
                    </div>

                    {/* Close button - moved to right */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-sage/10 rounded-full transition ml-2"
                        title="Cerrar"
                    >
                        <span className="material-symbols-outlined text-muted-foreground">close</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
