import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import { MediaFile, TimelineItem, TransitionType, ExportSettings, AudioSettings } from '../types';

class FFmpegService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load() {
    if (this.loaded) return;

    try {
      this.ffmpeg = new FFmpeg();
      
      this.ffmpeg.on('progress', ({ progress, time }) => {
        const event = new CustomEvent('ffmpeg-progress', { 
          detail: { progress: progress * 100, time } 
        });
        window.dispatchEvent(event);
      });

      this.ffmpeg.on('log', ({ message }) => {
        console.log('FFmpeg:', message);
      });

      // Charger FFmpeg directement depuis le CDN sans blob URLs
      // Cela évite les problèmes de CSP avec les blob URLs
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      try {
        // Essayer de charger avec les URLs directes
        await this.ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
          workerURL: `${baseURL}/ffmpeg-core.worker.js`
        });
      } catch (directLoadError) {
        console.warn('Direct load failed, trying with blob URLs:', directLoadError);
        
        // Si le chargement direct échoue, essayer avec les blob URLs
        try {
          const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
          const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
          const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');
          
          await this.ffmpeg.load({
            coreURL,
            wasmURL,
            workerURL
          });
        } catch (blobError) {
          console.error('Both loading methods failed');
          throw blobError;
        }
      }

      this.loaded = true;
      console.log('FFmpeg loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
      this.loaded = false;
      throw error;
    }
  }

  async processVideo(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[],
    audioSettings: AudioSettings,
    exportSettings: ExportSettings
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      console.error('FFmpeg not loaded, attempting to load...');
      await this.load();
      if (!this.ffmpeg || !this.loaded) {
        throw new Error('FFmpeg not available');
      }
    }

    try {
      console.log('Starting video processing...');
      
      // Écrire les fichiers dans le système de fichiers virtuel
      for (const media of mediaFiles) {
        console.log(`Writing file: ${media.name}`);
        const data = await fetchFile(media.file);
        await this.ffmpeg.writeFile(media.name, data);
      }

      const args = this.buildFFmpegCommand(timeline, mediaFiles, audioSettings, exportSettings);
      console.log('FFmpeg command:', args.join(' '));
      
      await this.ffmpeg.exec(args);

      const outputFile = `output.${exportSettings.format}`;
      console.log(`Reading output file: ${outputFile}`);
      const data = await this.ffmpeg.readFile(outputFile);
      
      // Nettoyer les fichiers
      for (const media of mediaFiles) {
        try {
          await this.ffmpeg.deleteFile(media.name);
        } catch (e) {
          console.warn(`Failed to delete file ${media.name}:`, e);
        }
      }
      
      try {
        await this.ffmpeg.deleteFile(outputFile);
      } catch (e) {}

      console.log('Video processing completed successfully');
      return new Blob([data], { type: `video/${exportSettings.format}` });
    } catch (error) {
      console.error('FFmpeg processing error:', error);
      throw error;
    }
  }

  private buildFFmpegCommand(
    timeline: TimelineItem[],
    mediaFiles: MediaFile[],
    audioSettings: AudioSettings,
    exportSettings: ExportSettings
  ): string[] {
    const args: string[] = [];
    const { width, height } = exportSettings.resolution;
    
    const sortedTimeline = [...timeline].sort((a, b) => a.startTime - b.startTime);
    
    for (let i = 0; i < sortedTimeline.length; i++) {
      const item = sortedTimeline[i];
      const media = mediaFiles.find(m => m.id === item.mediaId);
      
      if (!media) continue;

      if (media.type === 'image') {
        args.push('-loop', '1', '-t', item.duration.toString(), '-i', media.name);
      } else {
        args.push('-i', media.name);
      }
    }

    const audioFile = mediaFiles.find(m => m.type === 'audio');
    if (audioFile) {
      args.push('-i', audioFile.name);
    }

    let filterComplex = '';
    const videoInputs: string[] = [];

    for (let i = 0; i < sortedTimeline.length; i++) {
      const item = sortedTimeline[i];
      const media = mediaFiles.find(m => m.id === item.mediaId);
      
      if (!media || media.type === 'audio') continue;

      filterComplex += `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[v${i}];`;
      videoInputs.push(`[v${i}]`);
    }

    if (videoInputs.length > 1) {
      let prevOutput = videoInputs[0];
      
      for (let i = 1; i < videoInputs.length; i++) {
        const transition = sortedTimeline[i - 1].transition || 'cut';
        const duration = sortedTimeline[i - 1].transitionDuration || 1;
        
        if (transition !== 'cut') {
          const transitionFilter = this.getTransitionFilter(transition, duration, sortedTimeline[i - 1].endTime);
          filterComplex += `${prevOutput}${videoInputs[i]}${transitionFilter}[vout${i}];`;
          prevOutput = `[vout${i}]`;
        } else {
          if (i === videoInputs.length - 1) {
            filterComplex += `${prevOutput}${videoInputs[i]}concat=n=2:v=1:a=0[vout];`;
          } else {
            filterComplex += `${prevOutput}${videoInputs[i]}concat=n=2:v=1:a=0[vconcat${i}];`;
            prevOutput = `[vconcat${i}]`;
          }
        }
      }
      
      if (prevOutput !== '[vout]' && !prevOutput.includes('vout')) {
        filterComplex = filterComplex.replace(/;$/, '') + '[vout];';
      }
    } else {
      filterComplex += `${videoInputs[0]}copy[vout];`;
    }

    if (audioFile) {
      const videoAudioInputs = sortedTimeline
        .filter(item => {
          const media = mediaFiles.find(m => m.id === item.mediaId);
          return media && media.type === 'video';
        })
        .map((_, i) => `[${i}:a]`);

      if (videoAudioInputs.length > 0 && audioSettings.mixMode === 'mix') {
        filterComplex += `${videoAudioInputs.join('')}[${sortedTimeline.length}:a]amix=inputs=${videoAudioInputs.length + 1}:duration=longest:weights=${audioSettings.videoVolume} ${audioSettings.musicVolume}[aout]`;
      } else {
        filterComplex += `[${sortedTimeline.length}:a]volume=${audioSettings.musicVolume}[aout]`;
      }
    }

    args.push('-filter_complex', filterComplex);
    args.push('-map', '[vout]');
    
    if (audioFile) {
      args.push('-map', '[aout]');
    }

    const preset = exportSettings.preset === 'fast' ? 'ultrafast' : 
                   exportSettings.preset === 'slow' ? 'slow' : 'medium';
    
    args.push(
      '-c:v', exportSettings.format === 'webm' ? 'libvpx-vp9' : 'libx264',
      '-preset', preset,
      '-crf', '23',
      '-c:a', exportSettings.format === 'webm' ? 'libopus' : 'aac',
      '-b:a', '128k',
      `output.${exportSettings.format}`
    );

    return args;
  }

  private getTransitionFilter(transition: TransitionType, duration: number, offset: number): string {
    switch (transition) {
      case 'crossfade':
        return `xfade=transition=fade:duration=${duration}:offset=${offset}`;
      case 'fade':
        return `xfade=transition=fadeblack:duration=${duration}:offset=${offset}`;
      case 'slide-left':
        return `xfade=transition=slideleft:duration=${duration}:offset=${offset}`;
      case 'slide-right':
        return `xfade=transition=slideright:duration=${duration}:offset=${offset}`;
      case 'wipe':
        return `xfade=transition=wipeleft:duration=${duration}:offset=${offset}`;
      default:
        return '';
    }
  }

  async generateThumbnail(file: File): Promise<string> {
    // Pour l'instant, utiliser une méthode alternative sans FFmpeg
    // car FFmpeg peut ne pas être chargé immédiatement
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        resolve('');
        return;
      }

      // Configuration de la vidéo
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const videoUrl = URL.createObjectURL(file);
      
      video.onloadeddata = () => {
        // Attendre que la vidéo soit complètement chargée
        video.currentTime = 0.5; // Prendre une frame après 0.5 secondes
      };
      
      video.onseeked = () => {
        // La vidéo est prête, on peut capturer la frame
        try {
          // Définir la taille du canvas
          canvas.width = 320; // Taille fixe pour les miniatures
          canvas.height = 180; // Format 16:9
          
          // Calculer le ratio pour garder les proportions
          const videoRatio = video.videoWidth / video.videoHeight;
          const canvasRatio = canvas.width / canvas.height;
          
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;
          let offsetX = 0;
          let offsetY = 0;
          
          if (videoRatio > canvasRatio) {
            drawHeight = canvas.width / videoRatio;
            offsetY = (canvas.height - drawHeight) / 2;
          } else {
            drawWidth = canvas.height * videoRatio;
            offsetX = (canvas.width - drawWidth) / 2;
          }
          
          // Effacer le canvas et dessiner un fond noir
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Dessiner la vidéo
          ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
          
          // Convertir en blob
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailUrl = URL.createObjectURL(blob);
              console.log('Thumbnail generated successfully for:', file.name);
              resolve(thumbnailUrl);
            } else {
              console.warn('Failed to create thumbnail blob for:', file.name);
              resolve('');
            }
            // Nettoyer les ressources
            URL.revokeObjectURL(videoUrl);
            video.remove();
            canvas.remove();
          }, 'image/jpeg', 0.8);
        } catch (error) {
          console.error('Error drawing thumbnail:', error);
          resolve('');
          URL.revokeObjectURL(videoUrl);
        }
      };
      
      video.onerror = (error) => {
        console.error('Video load error for thumbnail:', error);
        resolve('');
        URL.revokeObjectURL(videoUrl);
        video.remove();
        canvas.remove();
      };
      
      // Charger la vidéo
      video.src = videoUrl;
      video.load();
    });
  }

  async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      
      const videoUrl = URL.createObjectURL(file);
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        URL.revokeObjectURL(videoUrl);
        video.remove();
        console.log('Video duration for', file.name, ':', duration);
        resolve(duration || 10); // Durée par défaut si non disponible
      };
      
      video.onerror = () => {
        console.error('Failed to load video metadata for:', file.name);
        URL.revokeObjectURL(videoUrl);
        video.remove();
        resolve(10); // Durée par défaut en cas d'erreur
      };
      
      video.src = videoUrl;
      video.load();
    });
  }

  cleanup() {
    if (this.ffmpeg) {
      this.ffmpeg = null;
      this.loaded = false;
    }
  }
}

const ffmpegServiceInstance = new FFmpegService();
export default ffmpegServiceInstance;