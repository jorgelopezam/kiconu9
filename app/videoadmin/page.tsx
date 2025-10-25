'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore-helpers';
import { db } from '@/lib/firestore';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { Video, VideoCategory, VideoStatus, COLLECTIONS } from '@/lib/firestore-schema';
import { EditVideoModal } from '@/components/panel/EditVideoModal';
import { UploadVideoModal } from '@/components/panel/UploadVideoModal';
import { getMuxThumbnailUrl } from '@/lib/mux';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps {
  video: Video;
  onEdit: (video: Video) => void;
  onDelete: (videoId: string) => void;
}

function SortableRow({ video, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-t border-sage/30 group"
    >
      <td className="h-[72px] pl-4 py-2">
        <span
          {...attributes}
          {...listeners}
          className="material-symbols-outlined text-muted-foreground cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          drag_indicator
        </span>
      </td>
      <td className="h-[42px] pr-1  w-140">
        <img
          src={video.thumbnail_url}
          alt="Video thumbnail"
          className=" object-cover rounded-sm"
          style={{ aspectRatio: '4/3' }}
        />
      </td>
      <td className="h-[72px] px-2 py-2 text-foreground text-sm font-normal">
        {video.title}
      </td>
      <td className="h-[72px] px-4 py-2">
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
            video.category === 'Nutrición'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
          }`}
        >
          {video.category}
        </span>
      </td>
      <td className="h-[72px] px-4 py-2 text-muted-foreground text-sm">
        {new Date(video.date_added).toLocaleDateString('es-ES')}
      </td>
      <td className="h-[72px] px-4 py-2">
        <button
          className={`flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-8 px-4 text-sm font-medium w-full ${
            video.status === 'Publicado'
              ? 'bg-primary/20 text-foreground'
              : 'bg-sage/20 text-foreground'
          }`}
        >
          {video.status}
        </button>
      </td>
      <td className="h-[72px] px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(video)}
            className="p-2 rounded-lg hover:bg-surface/50 text-foreground"
            title="Editar"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button
            onClick={() => onDelete(video.id)}
            className="p-2 rounded-lg hover:bg-surface/50 text-foreground"
            title="Eliminar"
          >
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function VideoAdminPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<1 | 2 | 3>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        router.push('/');
        return;
      }

      const profile = await getUserProfile(user.uid);
      if (!profile?.is_admin) {
        router.push('/panel');
        return;
      }

      setLoading(false);
      loadVideos();
    };

    checkAdmin();
  }, [user, router]);

  const loadVideos = async () => {
    try {
      const videosRef = collection(db, COLLECTIONS.VIDEOS);
      const snapshot = await getDocs(videosRef);
      
      const loadedVideos: Video[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date_added: data.date_added?.toDate() || new Date(),
        } as Video;
      });
      
      // Sort client-side instead of using Firestore query
      loadedVideos.sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase;
        return a.order - b.order;
      });
      
      setVideos(loadedVideos);
      console.log('Videos loaded:', loadedVideos.length);
    } catch (error) {
      console.error('Error loading videos:', error);
    }
  };

  const handleUploadVideo = async (
    videoData: {
      file: File;
      title: string;
      description: string;
      category: VideoCategory;
      phase: 1 | 2 | 3;
      status: VideoStatus;
    },
    onProgress?: (progress: number) => void
  ) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      console.log('Step 1: Creating direct upload URL...');
      // Step 1: Create direct upload URL
      const uploadResponse = await fetch('/api/mux/create-upload', {
        method: 'POST',
      });
      
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Failed to create upload URL:', errorText);
        throw new Error('No se pudo crear la URL de subida');
      }
      
      const { uploadUrl, uploadId } = await uploadResponse.json();
      console.log('Upload ID:', uploadId);
      console.log('Upload URL:', uploadUrl);

      console.log('Step 2: Uploading video to Mux with progress tracking...');
      // Step 2: Upload video to Mux with progress tracking using XMLHttpRequest
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            console.log(`Upload progress: ${percentComplete}%`);
            onProgress?.(percentComplete);
          }
        });
        
        xhr.addEventListener('load', () => {
          console.log('XHR load event - Status:', xhr.status, xhr.statusText);
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('Video uploaded successfully to Mux');
            resolve();
          } else {
            console.error('Upload failed with status:', xhr.status, xhr.statusText);
            console.error('Response:', xhr.responseText);
            reject(new Error(`Error al subir a Mux: ${xhr.status} ${xhr.statusText}`));
          }
        });
        
        xhr.addEventListener('error', (e) => {
          console.error('XHR error event:', e);
          reject(new Error('Error de red durante la subida'));
        });
        
        xhr.addEventListener('abort', () => {
          console.error('Upload aborted');
          reject(new Error('Subida cancelada'));
        });
        
        xhr.open('PUT', uploadUrl);
        // Don't set Content-Type - let browser set it automatically for the file
        console.log('Sending file:', videoData.file.name, 'Size:', videoData.file.size);
        xhr.send(videoData.file);
      });

      console.log('Step 3: Waiting for upload to complete and asset to be created...');
      // Give Mux a moment to process the upload
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Poll upload status to get asset_id
      let uploadComplete = false;
      let assetId: string | null = null;
      let attempts = 0;
      
      while (!uploadComplete && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Check every 3 seconds
        
        try {
          const statusResponse = await fetch(`/api/mux/upload/${uploadId}`);
          
          if (!statusResponse.ok) {
            console.error('Failed to get upload status:', statusResponse.status, statusResponse.statusText);
            attempts++;
            continue;
          }
          
          const uploadStatus = await statusResponse.json();
          
          console.log(`Attempt ${attempts + 1}: Upload status:`, uploadStatus.status, 'Asset ID:', uploadStatus.assetId);
          
          if (uploadStatus.assetId) {
            assetId = uploadStatus.assetId;
            uploadComplete = true;
          }
          
          // Check if upload errored
          if (uploadStatus.status === 'errored') {
            const errorMessage = uploadStatus.error?.message || 'Unknown error';
            console.error('Mux upload error:', uploadStatus.error);
            throw new Error(`Mux upload failed: ${errorMessage}. The video file may be corrupted or in an unsupported format.`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Mux upload failed')) {
            throw error;
          }
          console.log('Waiting for upload to complete...');
        }
        
        attempts++;
      }

      if (!assetId) {
        throw new Error('Upload timed out: Asset was not created. Please try again with a smaller file or check your Mux account.');
      }

      console.log('Step 4: Waiting for asset to be ready...');
      // Step 4: Wait for asset to be ready
      let assetReady = false;
      let assetData: { status?: string; errors?: unknown; playbackId?: string } | null = null;
      attempts = 0;
      
      while (!assetReady && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const assetResponse = await fetch(`/api/mux/asset/${assetId}`);
          assetData = (await assetResponse.json()) as {
            status?: string;
            errors?: unknown;
            playbackId?: string;
          };
          
          console.log(`Attempt ${attempts + 1}: Asset status:`, assetData.status);
          
          if (assetData.status === 'ready') {
            assetReady = true;
          } else if (assetData.status === 'errored') {
            // Asset processing failed
            console.error('Asset processing failed:', assetData.errors);
            const errorMessages = assetData.errors?.messages || assetData.errors || [];
            const errorText = Array.isArray(errorMessages) 
              ? errorMessages.join(', ') 
              : JSON.stringify(errorMessages);
            throw new Error(`Mux no pudo procesar el video: ${errorText || 'Error desconocido'}. Por favor verifica que el archivo de video no esté corrupto y esté en un formato compatible (MP4, MOV, etc).`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('Mux no pudo procesar')) {
            throw error;
          }
          console.log('Asset not ready yet...');
        }
        
        attempts++;
      }

      if (!assetReady || !assetData) {
        throw new Error('El procesamiento del video tomó demasiado tiempo. El video puede seguir procesándose. Intenta de nuevo en unos minutos.');
      }

      console.log('Step 5: Creating video document in Firestore...');
      // Step 5: Get the highest order number for the phase
      const phaseVideos = videos.filter(v => v.phase === videoData.phase);
      const maxOrder = phaseVideos.length > 0 
        ? Math.max(...phaseVideos.map(v => v.order))
        : 0;

      // Step 6: Create video document in Firestore
      const thumbnailUrl = getMuxThumbnailUrl(assetData.playbackId, {
        width: 640,
        height: 360,
        time: 1,
      });

      const videoDoc = {
        title: videoData.title,
        description: videoData.description,
        thumbnail_url: thumbnailUrl,
        phase: videoData.phase,
        order: maxOrder + 1,
        date_added: Timestamp.now(),
        status: videoData.status,
        duration: assetData.duration || 0,
        mux_asset_id: assetId,
        mux_playback_id: assetData.playbackId,
        category: videoData.category,
        created_by: user.uid,
      };

      console.log('Step 6: Saving to Firestore...', videoDoc);
      await addDoc(collection(db, COLLECTIONS.VIDEOS), videoDoc);
      
      console.log('Step 7: Reloading videos...');
      // Reload videos
      await loadVideos();
      
      console.log('Upload complete!');
      alert('Video subido exitosamente');
    } catch (error) {
      console.error('Error in handleUploadVideo:', error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw new Error(`Error al subir video: ${error.message}`);
      }
      throw new Error('Error desconocido al subir video');
    }
  };

  const handleEditVideo = (video: Video) => {
    setSelectedVideo(video);
    setIsEditModalOpen(true);
  };

  const handleSaveVideo = async (updatedData: Partial<Video>) => {
    if (!selectedVideo) return;

    try {
      const videoRef = doc(db, COLLECTIONS.VIDEOS, selectedVideo.id);
      await updateDoc(videoRef, {
        ...updatedData,
      });

      await loadVideos();
      setIsEditModalOpen(false);
      setSelectedVideo(null);
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este video?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, COLLECTIONS.VIDEOS, videoId));
      await loadVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error al eliminar el video');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = filteredVideos.findIndex((v) => v.id === active.id);
    const newIndex = filteredVideos.findIndex((v) => v.id === over.id);

    const newVideos = arrayMove(filteredVideos, oldIndex, newIndex);

    // Update order in Firestore
    try {
      const batch = writeBatch(db);
      
      newVideos.forEach((video, index) => {
        const videoRef = doc(db, COLLECTIONS.VIDEOS, video.id);
        batch.update(videoRef, { order: index });
      });

      await batch.commit();
      await loadVideos();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const filteredVideos = videos
    .filter(v => v.phase === selectedPhase)
    .filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !categoryFilter || v.category === categoryFilter;
      const matchesStatus = !statusFilter || v.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => a.order - b.order);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-10 lg:px-10 bg-background">
      <div className="max-w-[1024px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Administración de Videos
            </h1>
            {/*<p className="text-muted-foreground text-base">
              Gestiona los videos de coaching para el programa Kiconu.
            </p>*/}
          </div>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="hidden sm:flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary-600 transition-colors"
          >
            Subir Video
          </button>
        </div>

        {/* Phase Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-sage/30">
            <button
              onClick={() => setSelectedPhase(1)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === 1
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Fase 1
            </button>
            <button
              onClick={() => setSelectedPhase(2)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === 2
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Fase 2
            </button>
            <button
              onClick={() => setSelectedPhase(3)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedPhase === 3
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Fase 3
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative w-full sm:max-w-xs">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título o descripción"
              className="pl-10 pr-4 py-2 w-full rounded-lg border border-sage/40 bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 px-4 py-2 rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
            >
              <option value="">Categoría</option>
              <option value="Nutrición">Nutrición</option>
              <option value="Transpersonal">Transpersonal</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              expand_more
            </span>
          </div>

          <div className="relative w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none w-full sm:w-48 px-4 py-2 rounded-lg border border-sage/40 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
            >
              <option value="">Estado</option>
              <option value="Publicado">Publicado</option>
              <option value="Borrador">Borrador</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              expand_more
            </span>
          </div>
        </div>

        {/* Videos Table */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="overflow-hidden rounded-xl border border-sage/30 bg-surface">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface border-b border-sage/30">
                  <th className="p-4 text-left text-muted-foreground w-12 text-sm font-medium"></th>
                  <th className="pl-4 pr-2 py-3 text-left text-foreground w-16 text-sm font-medium"></th>
                  <th className="px-2 py-3 text-left text-foreground w-[30%] text-sm font-medium">
                    Título del Video
                  </th>
                  <th className="px-4 py-3 text-left text-foreground w-[15%] text-sm font-medium">
                    Coach
                  </th>
                  <th className="px-4 py-3 text-left text-foreground w-[15%] text-sm font-medium">
                    Fecha de Subida
                  </th>
                  <th className="px-4 py-3 text-left text-foreground w-[15%] text-sm font-medium">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-muted-foreground w-[15%] text-sm font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredVideos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay videos en esta fase
                    </td>
                  </tr>
                ) : (
                  <SortableContext
                    items={filteredVideos.map((v) => v.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredVideos.map((video) => (
                      <SortableRow
                        key={video.id}
                        video={video}
                        onEdit={handleEditVideo}
                        onDelete={handleDeleteVideo}
                      />
                    ))}
                  </SortableContext>
                )}
              </tbody>
            </table>
          </div>
        </DndContext>

        {/* Mobile Upload Button */}
        <div className="fixed bottom-5 right-5 sm:hidden">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-primary text-white text-base font-bold shadow-lg hover:bg-primary-600 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <UploadVideoModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadVideo}
        defaultPhase={selectedPhase}
      />

      <EditVideoModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
        onSave={handleSaveVideo}
      />
    </div>
  );
}
