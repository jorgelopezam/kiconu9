'use client';

import { useState, useEffect } from 'react';
import { Video, VideoCategory, VideoStatus } from '@/lib/firestore-schema';

interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
  onSave: (updatedVideo: Partial<Video>) => Promise<void>;
}

export function EditVideoModal({ isOpen, onClose, video, onSave }: EditVideoModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VideoCategory>('Nutrición');
  const [status, setStatus] = useState<VideoStatus>('Borrador');
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description);
      setCategory(video.category);
      setStatus(video.status);
      setPhase(video.phase);
    }
  }, [video]);

  const handleSave = async () => {
    if (!video) return;

    setIsSaving(true);
    try {
      await onSave({
        title,
        description,
        category,
        status,
        phase,
      });
      onClose();
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Error al guardar el video');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose();
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl mx-4 bg-surface rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-sage/30 bg-surface">
          <h2 className="text-2xl font-bold text-foreground">
            Editar Video
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface/50 transition-colors"
            disabled={isSaving}
          >
            <span className="material-symbols-outlined text-muted-foreground">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Video Preview */}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-sage/10">
            <img
              src={video.thumbnail_url}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Título del Video
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Ej: Introducción a la Nutrición Consciente"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Describe el contenido del video..."
            />
          </div>

          {/* Category and Phase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Categoría
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VideoCategory)}
                  className="appearance-none w-full px-4 py-2 rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Nutrición">Nutrición</option>
                  <option value="Transpersonal">Transpersonal</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fase
              </label>
              <div className="relative">
                <select
                  value={phase}
                  onChange={(e) => setPhase(Number(e.target.value) as 1 | 2 | 3)}
                  className="appearance-none w-full px-4 py-2 rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value={1}>Fase 1</option>
                  <option value={2}>Fase 2</option>
                  <option value={3}>Fase 3</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Estado
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setStatus('Publicado')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  status === 'Publicado'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-sage/40 text-muted-foreground hover:border-sage/60'
                }`}
              >
                Publicado
              </button>
              <button
                onClick={() => setStatus('Borrador')}
                className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${
                  status === 'Borrador'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-sage/40 text-muted-foreground hover:border-sage/60'
                }`}
              >
                Borrador
              </button>
            </div>
          </div>

          {/* Video Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-sage/5 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Duración</p>
              <p className="text-base font-medium text-foreground">
                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Subida</p>
              <p className="text-base font-medium text-foreground">
                {new Date(video.date_added).toLocaleDateString('es-ES')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t border-sage/30 bg-surface">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-sage/40 text-foreground hover:bg-surface/50 transition-colors"
            disabled={isSaving}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-primary text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving || !title.trim()}
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
