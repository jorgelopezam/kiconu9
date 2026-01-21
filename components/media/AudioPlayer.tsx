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
    const [bufferProgress, setBufferProgress] = useState(0);

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

        const handleProgress = () => {
            if (audio.buffered.length > 0 && audio.duration > 0) {
                const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                const progress = Math.round((bufferedEnd / audio.duration) * 100);
                setBufferProgress(progress);
            }
        };

        const handleCanPlayThrough = () => {
            setIsLoading(false);
            setBufferProgress(100);
        };

        const handleWaiting = () => {
            setIsLoading(true);
        };

        const handlePlaying = () => {
            setIsLoading(false);
        };

        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("timeupdate", handleTimeUpdate);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("progress", handleProgress);
        audio.addEventListener("canplaythrough", handleCanPlayThrough);
        audio.addEventListener("waiting", handleWaiting);
        audio.addEventListener("playing", handlePlaying);

        return () => {
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("timeupdate", handleTimeUpdate);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("progress", handleProgress);
            audio.removeEventListener("canplaythrough", handleCanPlayThrough);
            audio.removeEventListener("waiting", handleWaiting);
            audio.removeEventListener("playing", handlePlaying);
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
            <audio ref={audioRef} src={src} preload="auto" autoPlay />

            <div className="max-w-4xl mx-auto px-4 py-3">
                {/* Loading overlay */}
                {isLoading && (
                    <div className="mb-3 rounded-xl bg-desert-sand/30 dark:bg-sage/20 p-3">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin">
                                <span className="material-symbols-outlined text-primary">autorenew</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">Cargando audio...</p>
                                <div className="mt-1.5 h-2 rounded-full bg-sage/20 overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${bufferProgress}%` }}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{bufferProgress}% cargado</p>
                            </div>
                        </div>
                    </div>
                )}
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
