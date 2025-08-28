import React, { useCallback, useState, useEffect } from 'react';
import { Upload, X, Image, Film, Music } from 'lucide-react';
import { MediaFile, MediaType } from '../types';
import ffmpegService from '../services/ffmpeg.service';

interface FileUploadProps {
  onFilesAdded: (files: MediaFile[]) => void;
  files: MediaFile[];
  onFileRemove: (id: string) => void;
}

const createFallbackThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      resolve('');
      return;
    }
    
    canvas.width = 320;
    canvas.height = 180;
    
    const handleVideoReady = () => {
      try {
        // Dessiner un fond gris
        ctx.fillStyle = '#333333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Essayer de dessiner une frame de la vidéo
        if (video.videoWidth && video.videoHeight) {
          const scale = Math.min(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
          const width = video.videoWidth * scale;
          const height = video.videoHeight * scale;
          const x = (canvas.width - width) / 2;
          const y = (canvas.height - height) / 2;
          ctx.drawImage(video, x, y, width, height);
        }
        
        // Ajouter une icône de vidéo au centre
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('▶', canvas.width / 2, canvas.height / 2);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve('');
          }
          video.remove();
          canvas.remove();
        }, 'image/jpeg', 0.8);
      } catch (error) {
        console.error('Fallback thumbnail error:', error);
        resolve('');
      }
    };
    
    video.addEventListener('loadeddata', handleVideoReady);
    video.addEventListener('error', () => {
      // En cas d'erreur, créer une miniature générique
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎬', canvas.width / 2, canvas.height / 2);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve('');
        }
        video.remove();
        canvas.remove();
      }, 'image/jpeg', 0.8);
    });
    
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.currentTime = 0.1;
  });
};

const FileUpload: React.FC<FileUploadProps> = ({ onFilesAdded, files, onFileRemove }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialiser FFmpeg au chargement du composant
    const initFFmpeg = async () => {
      try {
        await ffmpegService.load();
        console.log('FFmpeg initialized in FileUpload');
      } catch (error) {
        console.error('Failed to initialize FFmpeg in FileUpload:', error);
        // Continue sans FFmpeg, utilise les méthodes alternatives
      }
    };
    initFFmpeg();
  }, []);

  const getMediaType = (file: File): MediaType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    // Vérifier aussi par extension de fichier
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext || '')) return 'audio';
    if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'image';
    return 'image';
  };

  const processFiles = useCallback(async (fileList: FileList) => {
    setIsProcessing(true);
    const newFiles: MediaFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const type = getMediaType(file);
      const url = URL.createObjectURL(file);
      
      const mediaFile: MediaFile = {
        id: Math.random().toString(36).substr(2, 9),
        file,
        type,
        url,
        name: file.name,
      };

      if (type === 'video') {
        try {
          // Récupérer la durée de la vidéo
          mediaFile.duration = await ffmpegService.getVideoDuration(file);
          
          // Générer la miniature
          mediaFile.thumbnail = await ffmpegService.generateThumbnail(file);
          
          // Si la miniature est vide, utiliser une méthode de fallback
          if (!mediaFile.thumbnail) {
            console.warn('Thumbnail generation failed, using fallback method for:', file.name);
            // Créer une miniature de secours avec Canvas API
            const fallbackThumbnail = await createFallbackThumbnail(file);
            mediaFile.thumbnail = fallbackThumbnail;
          }
          
          console.log('Video processed:', mediaFile.name, 'Duration:', mediaFile.duration, 'Thumbnail:', !!mediaFile.thumbnail);
        } catch (error) {
          console.error('Error processing video:', error);
          mediaFile.duration = 10; // Durée par défaut
        }
      } else if (type === 'image') {
        mediaFile.duration = 3;
      } else if (type === 'audio') {
        try {
          // Pour l'audio, essayer de récupérer la durée
          const audio = new Audio(url);
          await new Promise((resolve) => {
            audio.onloadedmetadata = resolve;
            audio.onerror = resolve;
          });
          mediaFile.duration = audio.duration || 0;
          console.log('Audio processed:', mediaFile.name, 'Duration:', mediaFile.duration);
        } catch (error) {
          console.error('Error processing audio:', error);
        }
      }

      newFiles.push(mediaFile);
    }

    onFilesAdded(newFiles);
    setIsProcessing(false);
  }, [onFilesAdded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset l'input pour permettre de sélectionner le même fichier à nouveau
      e.target.value = '';
    }
  }, [processFiles]);

  const getIcon = (type: MediaType) => {
    switch (type) {
      case 'image': return <Image className="w-8 h-8" />;
      case 'video': return <Film className="w-8 h-8" />;
      case 'audio': return <Music className="w-8 h-8" />;
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Upload Media Files</h2>
      
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors relative ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${isProcessing ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
          id="file-input"
          disabled={isProcessing}
        />
        <label htmlFor="file-input" className="block cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-2">Drag & drop files here</p>
          <p className="text-sm text-gray-500">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">
            Supports: JPG, PNG, WebP, MP4, WebM, MOV, AVI, MP3, WAV, AAC
          </p>
        </label>
      </div>

      {isProcessing && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-sm text-gray-600">Processing files...</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Uploaded Files</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map(file => (
              <div key={file.id} className="relative group">
                <div className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow">
                  {file.type === 'image' || file.thumbnail ? (
                    <img
                      src={file.type === 'image' ? file.url : file.thumbnail}
                      alt={file.name}
                      className="w-full h-24 object-cover rounded mb-2"
                    />
                  ) : (
                    <div className="w-full h-24 bg-gray-200 rounded mb-2 flex items-center justify-center">
                      {getIcon(file.type)}
                    </div>
                  )}
                  <p className="text-xs truncate" title={file.name}>
                    {file.name}
                  </p>
                  {file.duration && (
                    <p className="text-xs text-gray-500">
                      {Math.floor(file.duration / 60)}:{String(Math.floor(file.duration % 60)).padStart(2, '0')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onFileRemove(file.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;