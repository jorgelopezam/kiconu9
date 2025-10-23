'use client';

import { useState, useRef } from 'react';
import { VideoCategory, VideoStatus } from '@/lib/firestore-schema';

interface UploadVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (
    videoData: {
      file: File;
      title: string;
      description: string;
      category: VideoCategory;
      phase: 1 | 2 | 3;
      status: VideoStatus;
    },
    onProgress?: (progress: number) => void
  ) => Promise<void>;
  defaultPhase?: 1 | 2 | 3;
}

export function UploadVideoModal({ isOpen, onClose, onUpload, defaultPhase = 1 }: UploadVideoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VideoCategory>('Nutrición');
  const [status, setStatus] = useState<VideoStatus>('Borrador');
  const [phase, setPhase] = useState<1 | 2 | 3>(defaultPhase);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('video/')) {
      setFile(selectedFile);
    } else {
      alert('Por favor selecciona un archivo de video válido');
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      alert('Por favor completa el título y selecciona un archivo');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting upload from modal...');
      await onUpload(
        {
          file,
          title,
          description,
          category,
          phase,
          status,
        },
        (progress) => {
          console.log('Progress update:', progress);
          setUploadProgress(progress);
        }
      );
      
      console.log('Upload completed successfully');
      
      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setCategory('Nutrición');
      setStatus('Borrador');
      setPhase(defaultPhase);
      setUploadProgress(0);
      
      onClose();
    } catch (error) {
      console.error('Error in modal upload handler:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al subir el video: ${errorMessage}`);
      setUploadProgress(0);
    } finally {
      console.log('Upload process finished, resetting state');
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isUploading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl mx-4 bg-surface rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-sage/30 bg-surface">
          <h2 className="text-xl font-bold text-foreground">
            Subir Nuevo Video
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-surface/50 transition-colors disabled:opacity-50"
            disabled={isUploading}
          >
            <span className="material-symbols-outlined text-muted-foreground text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* File Upload */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Archivo de Video
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-sage/40 rounded-lg p-4 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
              {file ? (
                <div className="space-y-1">
                  <span className="material-symbols-outlined text-3xl text-primary">video_file</span>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="material-symbols-outlined text-3xl text-muted-foreground">cloud_upload</span>
                  <p className="text-sm font-medium text-foreground">
                    Haz clic para seleccionar un video
                  </p>
                  <p className="text-xs text-muted-foreground">
                    MP4, MOV, AVI, WebM (máx. 5GB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Subiendo...</span>
                <span className="text-primary font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-sage/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Título del Video *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="Ej: Introducción a la Nutrición Consciente"
              disabled={isUploading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
              placeholder="Describe el contenido del video..."
              disabled={isUploading}
            />
          </div>

          {/* Category and Phase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Categoría
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VideoCategory)}
                  className="appearance-none w-full px-3 py-1.5 text-sm rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={isUploading}
                >
                  <option value="Nutrición">Nutrición</option>
                  <option value="Transpersonal">Transpersonal</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Fase
              </label>
              <div className="relative">
                <select
                  value={phase}
                  onChange={(e) => setPhase(Number(e.target.value) as 1 | 2 | 3)}
                  className="appearance-none w-full px-3 py-1.5 text-sm rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={isUploading}
                >
                  <option value={1}>Fase 1</option>
                  <option value={2}>Fase 2</option>
                  <option value={3}>Fase 3</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Estado
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatus('Publicado')}
                disabled={isUploading}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg border-2 transition-all disabled:opacity-50 ${
                  status === 'Publicado'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-sage/40 text-muted-foreground hover:border-sage/60'
                }`}
              >
                Publicado
              </button>
              <button
                onClick={() => setStatus('Borrador')}
                disabled={isUploading}
                className={`flex-1 px-3 py-1.5 text-sm rounded-lg border-2 transition-all disabled:opacity-50 ${
                  status === 'Borrador'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-sage/40 text-muted-foreground hover:border-sage/60'
                }`}
              >
                Borrador
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-2 p-4 border-t border-sage/30 bg-surface">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 text-sm rounded-xl border border-sage/40 text-foreground hover:bg-surface/50 transition-colors disabled:opacity-50"
            disabled={isUploading}
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            className="px-4 py-1.5 text-sm rounded-xl bg-primary text-white font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isUploading || !file || !title.trim()}
          >
            {isUploading ? 'Subiendo...' : 'Subir Video'}
          </button>
        </div>
      </div>
    </div>
  );
}
