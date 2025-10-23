'use client';

import { useState, useRef, useEffect } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Video } from '@/lib/firestore-schema';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
  onProgress?: (videoId: string, watchedSeconds: number, progressPercentage: number) => void;
}

export function VideoPlayer({ video, onClose, onProgress }: VideoPlayerProps) {
  const playerRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleTimeUpdate = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.currentTime || 0;
      const duration = playerRef.current.duration || video.duration;
      const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;
      
      onProgress?.(video.id, currentTime, percentage);
    }
  };

  const skipForward = () => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.min(
        playerRef.current.currentTime + 10,
        playerRef.current.duration
      );
    }
  };

  const skipBackward = () => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(
        playerRef.current.currentTime - 10,
        0
      );
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onClose}
    >
      <div 
        className="relative w-full h-full max-w-screen-2xl max-h-screen flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button - Top Right Corner */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-20 backdrop-blur-sm"
          title="Cerrar"
        >
          <span className="material-symbols-outlined text-2xl text-white">close</span>
        </button>

        {/* Mux Player - Full screen minimalist */}
        <div className="w-full h-full flex items-center justify-center">
          <MuxPlayer
            ref={playerRef}
            playbackId={video.mux_playback_id}
            metadata={{
              video_id: video.id,
              video_title: video.title,
            }}
            streamType="on-demand"
            onTimeUpdate={handleTimeUpdate}
            autoPlay
            className="w-full h-full"
            style={{
              maxWidth: '100%',
              maxHeight: '100vh',
              aspectRatio: '16/9'
            }}
          />
        </div>
      </div>
    </div>
  );
}
