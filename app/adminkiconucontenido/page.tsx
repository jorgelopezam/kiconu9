'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/firestore-helpers';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, Timestamp, writeBatch, query, orderBy, getDoc } from 'firebase/firestore';
import { KiconuContent, KiconuContentType, COLLECTIONS } from '@/lib/firestore-schema';
import { getMuxThumbnailUrl } from '@/lib/mux';

const CONTENT_TYPES: { id: KiconuContentType; label: string; icon: string; color: string }[] = [
  { id: 'image', label: 'Imagen', icon: 'image', color: 'text-green-500' },
  { id: 'audio', label: 'Audio', icon: 'headphones', color: 'text-blue-500' },
  { id: 'video', label: 'Video', icon: 'videocam', color: 'text-red-500' },
  { id: 'document', label: 'Documento', icon: 'description', color: 'text-amber-600' },
];

export default function AdminKiconuContenidoPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="text-foreground">Cargando...</div></div>}>
      <AdminKiconuContenidoContent />
    </Suspense>
  );
}

function AdminKiconuContenidoContent() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<KiconuContent[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<1 | 2 | 3>(1);

  // Add content modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContentType, setNewContentType] = useState<KiconuContentType | null>(null);
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentDescription, setNewContentDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [addingContent, setAddingContent] = useState(false);

  // Edit content modal
  const [editingContent, setEditingContent] = useState<KiconuContent | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const profile = await getUserProfile(user.uid);
        setIsAdmin(Boolean(profile?.is_admin));
      } catch {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  // Redirect non-admins
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    } else if (!authLoading && user && !isAdmin && !loading) {
      router.push('/panel');
    }
  }, [user, authLoading, isAdmin, loading, router]);

  // Load content
  const loadContent = useCallback(async () => {
    if (!user || !isAdmin) return;

    try {
      const contentsRef = collection(db, COLLECTIONS.KICONU_CONTENT);
      const snapshot = await getDocs(contentsRef);

      const loadedContent: KiconuContent[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          created_at: data.created_at?.toDate() || new Date(),
        } as KiconuContent;
      });

      // Sort by phase then order
      loadedContent.sort((a, b) => {
        if (a.phase !== b.phase) return a.phase - b.phase;
        return a.order - b.order;
      });

      setContents(loadedContent);
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (user && isAdmin) {
      loadContent();
    }
  }, [user, isAdmin, loadContent]);

  // Upload file to Firebase Storage
  const uploadToStorage = async (file: File, contentType: KiconuContentType): Promise<string> => {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `kiconu-content/${contentType}s/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, path);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setUploadProgress(progress);
          setUploadStatus(`Subiendo archivo: ${progress}%`);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  // Upload video to Mux
  const uploadVideoToMux = async (file: File): Promise<{ playbackId: string; assetId: string; duration: number }> => {
    setUploadStatus('Creando URL de subida...');

    // Create direct upload URL
    const uploadResponse = await fetch('/api/mux/create-upload', {
      method: 'POST',
    });

    if (!uploadResponse.ok) {
      throw new Error('No se pudo crear la URL de subida');
    }

    const { uploadUrl, uploadId } = await uploadResponse.json();

    setUploadStatus('Subiendo video a Mux...');

    // Upload video to Mux
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          setUploadStatus(`Subiendo video: ${percentComplete}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Error al subir a Mux: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Error de red durante la subida')));
      xhr.open('PUT', uploadUrl);
      xhr.send(file);
    });

    setUploadStatus('Procesando video...');

    // Poll for asset ID
    let assetId: string | null = null;
    let attempts = 0;

    while (!assetId && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const statusResponse = await fetch(`/api/mux/upload/${uploadId}`);
        if (statusResponse.ok) {
          const uploadStatus = await statusResponse.json();
          if (uploadStatus.assetId) {
            assetId = uploadStatus.assetId;
          }
          if (uploadStatus.status === 'errored') {
            throw new Error('Mux upload failed');
          }
        }
      } catch (error) {
        console.log('Waiting for upload to complete...');
      }

      attempts++;
    }

    if (!assetId) {
      throw new Error('Upload timed out');
    }

    // Wait for asset to be ready
    setUploadStatus('Esperando procesamiento del video...');
    let assetReady = false;
    let playbackId = '';
    let duration = 0;
    attempts = 0;

    while (!assetReady && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const assetResponse = await fetch(`/api/mux/asset/${assetId}`);
        const assetData = await assetResponse.json();

        if (assetData.status === 'ready' && assetData.playbackId) {
          assetReady = true;
          playbackId = assetData.playbackId;
          duration = assetData.duration || 0;
        } else if (assetData.status === 'errored') {
          throw new Error('Asset processing failed');
        }
      } catch (error) {
        console.log('Asset not ready yet...');
      }

      attempts++;
    }

    if (!assetReady || !playbackId) {
      throw new Error('Video processing timed out');
    }

    return { playbackId, assetId, duration };
  };

  // Add content
  const handleAddContent = async () => {
    if (!user || !newContentType || !newContentTitle.trim() || !selectedFile) return;

    setAddingContent(true);
    setUploadProgress(0);
    setUploadStatus('Iniciando subida...');

    try {
      let fileUrl = '';
      let muxData: { playbackId: string; assetId: string; duration: number } | undefined;
      let thumbnailUrl = '';

      if (newContentType === 'video') {
        muxData = await uploadVideoToMux(selectedFile);
        fileUrl = getMuxThumbnailUrl(muxData.playbackId);
        thumbnailUrl = getMuxThumbnailUrl(muxData.playbackId, { width: 640, height: 360, time: 1 });
      } else {
        fileUrl = await uploadToStorage(selectedFile, newContentType);
      }

      // Get max order for phase
      const phaseContents = contents.filter(c => c.phase === selectedPhase);
      const maxOrder = phaseContents.length > 0 ? Math.max(...phaseContents.map(c => c.order)) : 0;

      const contentDoc = {
        title: newContentTitle.trim(),
        description: newContentDescription.trim() || '',
        type: newContentType,
        phase: selectedPhase,
        order: maxOrder + 1,
        file_url: fileUrl,
        mux_playback_id: muxData?.playbackId || null,
        mux_asset_id: muxData?.assetId || null,
        thumbnail_url: thumbnailUrl || null,
        duration: muxData?.duration || null,
        created_at: Timestamp.now(),
        created_by: user.uid,
      };

      await addDoc(collection(db, COLLECTIONS.KICONU_CONTENT), contentDoc);

      // Reset form
      setNewContentTitle('');
      setNewContentDescription('');
      setNewContentType(null);
      setSelectedFile(null);
      setShowAddModal(false);
      setUploadProgress(0);
      setUploadStatus('');

      await loadContent();
    } catch (error) {
      console.error('Error adding content:', error);
      alert('Error al subir el contenido. Por favor intenta de nuevo.');
    } finally {
      setAddingContent(false);
    }
  };

  // Update content
  const handleUpdateContent = async () => {
    if (!editingContent || !editTitle.trim()) return;

    try {
      const contentRef = doc(db, COLLECTIONS.KICONU_CONTENT, editingContent.id);
      await updateDoc(contentRef, {
        title: editTitle.trim(),
        description: editDescription.trim() || '',
      });

      setEditingContent(null);
      setEditTitle('');
      setEditDescription('');
      await loadContent();
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  // Delete content
  const handleDeleteContent = async (contentId: string) => {
    if (!confirm('¿Estás seguro de eliminar este contenido?')) return;

    try {
      await deleteDoc(doc(db, COLLECTIONS.KICONU_CONTENT, contentId));
      await loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  // Get filtered contents for current phase
  const filteredContents = contents.filter(c => c.phase === selectedPhase);

  // Get type info
  const getTypeInfo = (type: KiconuContentType) => {
    return CONTENT_TYPES.find(t => t.id === type) || CONTENT_TYPES[0];
  };

  // Get accepted files for type
  const getAcceptedFiles = (type: KiconuContentType) => {
    switch (type) {
      case 'image': return 'image/*';
      case 'audio': return 'audio/*,.mp3,.m4a,.wav,.aac';
      case 'video': return '.mov,.mp4,.webm,.m4v,video/mp4,video/quicktime,video/webm';
      case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen py-8 px-4 md:px-10 bg-background">
      <div className="max-w-[1024px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Programa Kiconu
            </h1>
            <p className="text-muted-foreground text-base">
              Gestiona el contenido del programa por fases.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="hidden sm:flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary-600 transition-colors"
          >
            Agregar Contenido
          </button>
        </div>

        {/* Phase Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-sage/30">
            {[1, 2, 3].map(phase => (
              <button
                key={phase}
                onClick={() => setSelectedPhase(phase as 1 | 2 | 3)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedPhase === phase
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Fase {phase}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {filteredContents.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-sage/30 rounded-xl">
            <span className="material-symbols-outlined text-5xl text-muted-foreground/40 mb-2">folder_open</span>
            <p className="text-muted-foreground">No hay contenido en esta fase</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredContents.map((content, index) => {
              const typeInfo = getTypeInfo(content.type);
              return (
                <div
                  key={content.id}
                  className="flex items-center gap-4 p-4 border border-sage/20 rounded-xl bg-surface hover:bg-sage/5 transition"
                >
                  {/* Thumbnail/Icon */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-sage/10 flex items-center justify-center">
                    {content.thumbnail_url ? (
                      <img src={content.thumbnail_url} alt={content.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className={`material-symbols-outlined text-3xl ${typeInfo.color}`}>
                        {typeInfo.icon}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{content.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`material-symbols-outlined text-sm ${typeInfo.color}`}>
                        {typeInfo.icon}
                      </span>
                      <span className="text-xs text-muted-foreground">{typeInfo.label}</span>
                      {content.duration && (
                        <span className="text-xs text-muted-foreground">
                          • {Math.floor(content.duration / 60)}:{String(content.duration % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Order indicator */}
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingContent(content);
                        setEditTitle(content.title);
                        setEditDescription(content.description || '');
                      }}
                      className="p-2 rounded-lg hover:bg-sage/10 text-muted-foreground"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteContent(content.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-500"
                      title="Eliminar"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Add Button */}
        <div className="fixed bottom-5 right-5 sm:hidden">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 w-14 bg-primary text-white text-base font-bold shadow-lg hover:bg-primary-600 transition-colors"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      {/* Add Content Modal - Type Selection */}
      {showAddModal && !newContentType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-foreground">Agregar Contenido</h2>
            <p className="mb-3 text-sm text-muted-foreground">Selecciona el tipo de contenido:</p>
            <div className="grid grid-cols-2 gap-3">
              {CONTENT_TYPES.map(type => (
                <button
                  key={type.id}
                  onClick={() => {
                    setNewContentType(type.id);
                    setSelectedFile(null);
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-sage/30 text-muted-foreground hover:border-primary hover:bg-primary/5 transition"
                >
                  <span className={`material-symbols-outlined text-3xl ${type.color}`}>
                    {type.icon}
                  </span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewContentTitle('');
                  setNewContentDescription('');
                }}
                className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Content Modal - File Upload */}
      {showAddModal && newContentType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-foreground">
              Agregar {CONTENT_TYPES.find(t => t.id === newContentType)?.label}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Título</label>
                <input
                  type="text"
                  value={newContentTitle}
                  onChange={(e) => setNewContentTitle(e.target.value)}
                  placeholder="Título del contenido"
                  className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Descripción (opcional)</label>
                <textarea
                  value={newContentDescription}
                  onChange={(e) => setNewContentDescription(e.target.value)}
                  placeholder="Descripción breve"
                  rows={2}
                  className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Archivo</label>
                <input
                  type="file"
                  accept={getAcceptedFiles(newContentType)}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-1 file:text-white file:cursor-pointer"
                />
                {selectedFile && (
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              {addingContent && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{uploadStatus}</span>
                    <span className="font-medium text-foreground">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-sage/20 overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setNewContentType(null); setSelectedFile(null); }}
                disabled={addingContent}
                className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20 disabled:opacity-50"
              >
                Atrás
              </button>
              <button
                onClick={handleAddContent}
                disabled={addingContent || !newContentTitle.trim() || !selectedFile}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
              >
                {addingContent ? 'Subiendo...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editingContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-foreground">Editar Contenido</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Título</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Descripción</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-sage/40 bg-desert-sand/20 px-4 py-2.5 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingContent(null);
                  setEditTitle('');
                  setEditDescription('');
                }}
                className="rounded-xl border border-sage/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-desert-sand/20"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateContent}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
