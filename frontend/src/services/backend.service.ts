import { MediaFile, TimelineItem, AudioSettings, ExportSettings } from '../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class BackendService {
  /**
   * Vérifie si le backend est disponible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/health`);
      const data = await response.json();
      return data.status === 'OK';
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  /**
   * Vérifie si FFmpeg est disponible sur le backend
   */
  async checkFFmpegStatus(): Promise<{ available: boolean; message?: string }> {
    try {
      const response = await fetch(`${API_URL}/ffmpeg-status`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('FFmpeg status check failed:', error);
      return { available: false, message: 'Cannot connect to backend' };
    }
  }

  /**
   * Export vidéo via le backend
   */
  async exportVideo(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[],
    audioSettings: AudioSettings,
    exportSettings: ExportSettings
  ): Promise<Blob> {
    try {
      // Vérifier d'abord si FFmpeg est disponible
      const ffmpegStatus = await this.checkFFmpegStatus();
      
      if (!ffmpegStatus.available) {
        // Utiliser l'export simple sans FFmpeg
        return await this.simpleExport(mediaFiles, timeline);
      }
      
      const formData = new FormData();
      
      // Ajouter les fichiers média
      for (const media of mediaFiles) {
        formData.append('files', media.file, media.name);
      }

      // Ajouter les métadonnées
      formData.append('timeline', JSON.stringify(timeline));
      formData.append('audioSettings', JSON.stringify(audioSettings));
      formData.append('exportSettings', JSON.stringify(exportSettings));

      const response = await fetch(`${API_URL}/export`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      return await response.blob();
    } catch (error) {
      console.error('Backend export failed:', error);
      // Essayer le fallback
      try {
        return await this.simpleExport(mediaFiles, timeline);
      } catch (fallbackError) {
        throw error;
      }
    }
  }
  
  /**
   * Export simple sans FFmpeg
   */
  async simpleExport(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[]
  ): Promise<Blob> {
    try {
      const formData = new FormData();
      
      // Trouver les fichiers média dans la timeline
      const timelineMediaIds = Array.from(new Set(timeline.map(t => t.mediaId)));
      const relevantMedia = mediaFiles.filter(m => timelineMediaIds.includes(m.id));
      
      if (relevantMedia.length === 0) {
        throw new Error('No media in timeline');
      }
      
      // Ajouter les fichiers
      for (const media of relevantMedia) {
        formData.append('files', media.file, media.name);
      }

      const response = await fetch(`${API_URL}/simple-export`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Simple export failed');
      }

      return await response.blob();
    } catch (error) {
      console.error('Simple export failed:', error);
      throw error;
    }
  }

  /**
   * Combine simplement les fichiers (fallback)
   */
  async combineFiles(files: File[]): Promise<Blob> {
    try {
      const formData = new FormData();
      
      for (const file of files) {
        formData.append('files', file);
      }

      const response = await fetch(`${API_URL}/combine`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Combine failed');
      }

      return await response.blob();
    } catch (error) {
      console.error('Backend combine failed:', error);
      throw error;
    }
  }

  /**
   * Upload des fichiers au backend (optionnel, pour le traitement séparé)
   */
  async uploadFiles(files: File[]): Promise<any> {
    try {
      const formData = new FormData();
      
      for (const file of files) {
        formData.append('media', file);
      }

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }
}

const backendService = new BackendService();
export default backendService;