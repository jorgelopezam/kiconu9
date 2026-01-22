"use client";

import { useEffect, useRef } from "react";

interface SimpleVideoPlayerProps {
    src: string;
    title: string;
    onClose: () => void;
}

export default function SimpleVideoPlayer({ src, title, onClose }: SimpleVideoPlayerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [onClose]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === containerRef.current) {
            onClose();
        }
    };

    return (
        <div
            ref={containerRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
            <div className="relative w-full max-w-5xl mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-400">play_circle</span>
                        <h3 className="text-white font-medium truncate">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                        title="Cerrar (Esc)"
                    >
                        <span className="material-symbols-outlined text-white">close</span>
                    </button>
                </div>

                {/* Video container */}
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
                    <video
                        ref={videoRef}
                        src={src}
                        controls
                        autoPlay
                        playsInline
                        className="w-full h-full"
                        controlsList="nodownload"
                    >
                        Tu navegador no soporta la reproducción de video.
                    </video>
                </div>
            </div>
        </div>
    );
}
