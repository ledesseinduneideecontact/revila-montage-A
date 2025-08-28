import React, { useState, useEffect, useCallback } from 'react';
import { Film, Save, RotateCcw } from 'lucide-react';
import FileUpload from './components/FileUpload';
import Timeline from './components/Timeline';
import TransitionSelector from './components/TransitionSelector';
import AudioControls from './components/AudioControls';
import PreviewPlayer from './components/PreviewPlayer';
import ExportPanel from './components/ExportPanel';
import ffmpegService from './services/ffmpeg.service';
import simplePreviewService from './services/simple-preview.service';
import backendService from './services/backend.service';
import {
  MediaFile,
  TimelineItem,
  AudioSettings,
  ExportSettings,
  Project,
  TransitionType,
} from './types';

function App() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>({
    masterVolume: 100,
    musicVolume: 80,
    videoVolume: 100,
    mixMode: 'mix',
  });
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'mp4',
    quality: 'HD',
    resolution: { width: 1280, height: 720 },
    preset: 'medium',
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [simplePreviewUrl, setSimplePreviewUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [projectName, setProjectName] = useState('My Video Project');

  useEffect(() => {
    loadFFmpeg();
    loadProjectFromStorage();
    checkBackend();

    const handleProgress = (event: CustomEvent) => {
      setExportProgress(event.detail.progress);
    };

    window.addEventListener('ffmpeg-progress', handleProgress as EventListener);
    return () => {
      window.removeEventListener('ffmpeg-progress', handleProgress as EventListener);
    };
  }, []);
  
  const checkBackend = async () => {
    try {
      const isHealthy = await backendService.checkHealth();
      if (isHealthy) {
        const ffmpegStatus = await backendService.checkFFmpegStatus();
        setBackendAvailable(true);
        console.log('Backend available:', ffmpegStatus);
      }
    } catch (error) {
      console.log('Backend not available, using client-side fallback');
      setBackendAvailable(false);
    }
  };

  const loadFFmpeg = async () => {
    try {
      await ffmpegService.load();
      setIsFFmpegLoaded(true);
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
    }
  };

  const loadProjectFromStorage = () => {
    const saved = localStorage.getItem('video-editor-project');
    if (saved) {
      try {
        const project: Project = JSON.parse(saved);
        setProjectName(project.name);
        setTimeline(project.timeline);
        setAudioSettings(project.audioSettings);
        setExportSettings(project.exportSettings);
      } catch (error) {
        console.error('Failed to load project:', error);
      }
    }
  };

  const saveProjectToStorage = useCallback(() => {
    const project: Project = {
      id: 'current',
      name: projectName,
      mediaFiles: [],
      timeline,
      audioSettings,
      exportSettings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localStorage.setItem('video-editor-project', JSON.stringify(project));
  }, [projectName, timeline, audioSettings, exportSettings]);

  useEffect(() => {
    const autoSaveTimer = setTimeout(() => {
      saveProjectToStorage();
    }, 1000);
    return () => clearTimeout(autoSaveTimer);
  }, [timeline, audioSettings, exportSettings, saveProjectToStorage]);

  const handleFilesAdded = async (files: MediaFile[]) => {
    setMediaFiles(prev => [...prev, ...files]);
    
    // Générer une preview simple avec le premier fichier vidéo/image
    const firstMedia = files.find(f => f.type === 'video' || f.type === 'image');
    if (firstMedia && !simplePreviewUrl) {
      const url = URL.createObjectURL(firstMedia.file);
      setSimplePreviewUrl(url);
    }
  };
  
  const handleAudioUpload = async (file: File) => {
    // Supprimer l'ancien fichier audio s'il existe
    setMediaFiles(prev => {
      const withoutAudio = prev.filter(f => f.type !== 'audio');
      
      // Créer le nouveau fichier audio
      const audioFile: MediaFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type: 'audio',
        url: URL.createObjectURL(file),
        name: file.name,
      };
      
      return [...withoutAudio, audioFile];
    });
  };
  
  const handleAudioRemove = () => {
    setMediaFiles(prev => prev.filter(f => f.type !== 'audio'));
  };

  const handleFileRemove = (id: string) => {
    setMediaFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      
      // Mettre à jour la preview si nécessaire
      if (updated.length === 0) {
        if (simplePreviewUrl) {
          URL.revokeObjectURL(simplePreviewUrl);
          setSimplePreviewUrl(null);
        }
      } else {
        const remainingMedia = updated.find(f => f.type === 'video' || f.type === 'image');
        if (remainingMedia && !simplePreviewUrl) {
          const url = URL.createObjectURL(remainingMedia.file);
          setSimplePreviewUrl(url);
        }
      }
      
      return updated;
    });
    setTimeline(prev => prev.filter(item => item.mediaId !== id));
  };

  const handleTransitionUpdate = async (itemId: string, transition: TransitionType, duration: number) => {
    setTimeline(prev => {
      const updated = prev.map(item =>
        item.id === itemId
          ? { ...item, transition, transitionDuration: duration }
          : item
      );
      
      // Générer une nouvelle preview si la timeline change
      updateSimplePreview(updated);
      return updated;
    });
  };
  
  const updateSimplePreview = async (currentTimeline: TimelineItem[]) => {
    if (currentTimeline.length > 0) {
      const url = await simplePreviewService.generatePreview(mediaFiles, currentTimeline);
      if (url && url !== simplePreviewUrl) {
        if (simplePreviewUrl) URL.revokeObjectURL(simplePreviewUrl);
        setSimplePreviewUrl(url);
      }
    }
  };

  const handleExport = async () => {
    if (timeline.length === 0) {
      alert('Please add media files to the timeline before exporting.');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      let blob: Blob | null = null;
      
      // Essayer d'abord le backend si disponible
      if (backendAvailable) {
        try {
          console.log('Using backend for video export...');
          blob = await backendService.exportVideo(
            mediaFiles,
            timeline,
            audioSettings,
            exportSettings
          );
          console.log('Backend export successful');
        } catch (error) {
          console.error('Backend export failed:', error);
          // Fallback sur le client
        }
      }
      
      // Si le backend n'est pas disponible ou a échoué, essayer FFmpeg client
      if (!blob && !isFFmpegLoaded) {
        console.log('FFmpeg not loaded, attempting to load...');
        await loadFFmpeg();
      }
      
      // Essayer d'utiliser FFmpeg si disponible
      if (!blob && isFFmpegLoaded) {
        try {
          blob = await ffmpegService.processVideo(
            mediaFiles,
            timeline,
            audioSettings,
            exportSettings
          );
        } catch (error) {
          console.error('FFmpeg export failed:', error);
        }
      }
      
      // Si FFmpeg n'échoue ou n'est pas disponible, utiliser la méthode alternative
      if (!blob) {
        console.log('Using simplified export as fallback...');
        
        // Créer une image composite simple ou télécharger le premier fichier
        const firstItem = timeline[0];
        const firstMedia = mediaFiles.find(m => m.id === firstItem.mediaId);
        
        if (firstMedia) {
          // Si c'est une image, créer un blob PNG
          if (firstMedia.type === 'image') {
            // Créer un canvas et dessiner l'image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = exportSettings.resolution.width;
              canvas.height = exportSettings.resolution.height;
              
              const img = new Image();
              await new Promise<void>((resolve) => {
                img.onload = () => {
                  ctx.fillStyle = '#000000';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  const scale = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                  );
                  
                  const width = img.width * scale;
                  const height = img.height * scale;
                  const x = (canvas.width - width) / 2;
                  const y = (canvas.height - height) / 2;
                  
                  ctx.drawImage(img, x, y, width, height);
                  resolve();
                };
                img.onerror = () => resolve();
                img.src = firstMedia.url;
              });
              
              // Convertir en blob
              blob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/png');
              });
              
              if (blob) {
                alert('FFmpeg not available. Exporting as image instead of video.');
              }
            }
          } else {
            // Si c'est déjà une vidéo ou audio, utiliser directement
            blob = firstMedia.file;
            alert('FFmpeg not available. Downloading the original file.');
          }
        }
        
        if (!blob) {
          alert('Could not export. Please try again.');
          return;
        }
      }

      // Le blob a déjà été créé ci-dessus

      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      const a = document.createElement('a');
      a.href = url;
      a.download = `video-export-${Date.now()}.${exportSettings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log('Export completed successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      
      // Message d'erreur plus détaillé
      let errorMessage = 'Export failed: ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      
      if (error.message && error.message.includes('FS error')) {
        errorMessage += '\n\nThis might be a browser compatibility issue. Try using Chrome or Edge.';
      }
      
      alert(errorMessage);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleNewProject = () => {
    if (window.confirm('Are you sure you want to start a new project? Unsaved changes will be lost.')) {
      setMediaFiles([]);
      setTimeline([]);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      if (simplePreviewUrl) {
        URL.revokeObjectURL(simplePreviewUrl);
        setSimplePreviewUrl(null);
      }
      setProjectName('My Video Project');
      localStorage.removeItem('video-editor-project');
    }
  };

  const audioFile = mediaFiles.find(f => f.type === 'audio');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Film className="w-8 h-8 text-blue-500" />
              <h1 className="text-xl font-bold">Video Editor</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewProject}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                New Project
              </button>
              <button
                onClick={saveProjectToStorage}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isFFmpegLoaded && !backendAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">Video processing engine is loading... Export will use simplified mode if FFmpeg fails to load.</p>
          </div>
        )}
        
        {backendAvailable && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">✓ Backend server connected. Full video processing available.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <FileUpload
              onFilesAdded={handleFilesAdded}
              files={mediaFiles}
              onFileRemove={handleFileRemove}
            />
            <Timeline
              mediaFiles={mediaFiles}
              timeline={timeline}
              onTimelineUpdate={(newTimeline) => {
                setTimeline(newTimeline);
                updateSimplePreview(newTimeline);
              }}
            />
            <TransitionSelector
              timeline={timeline}
              onTransitionUpdate={handleTransitionUpdate}
            />
          </div>

          <div className="space-y-6">
            <PreviewPlayer
              videoUrl={previewUrl || simplePreviewUrl}
              isProcessing={isExporting}
            />
            <AudioControls
              audioSettings={audioSettings}
              onSettingsChange={setAudioSettings}
              audioFile={audioFile}
              onAudioUpload={handleAudioUpload}
              onAudioRemove={handleAudioRemove}
            />
            <ExportPanel
              exportSettings={exportSettings}
              onSettingsChange={setExportSettings}
              onExport={handleExport}
              isExporting={isExporting}
              progress={exportProgress}
              canExport={timeline.length > 0}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
