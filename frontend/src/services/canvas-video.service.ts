import { MediaFile, TimelineItem, ExportSettings } from '../types';

class CanvasVideoService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  async createSimpleVideo(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[],
    exportSettings: ExportSettings
  ): Promise<Blob | null> {
    try {
      // Créer un canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = exportSettings.resolution.width;
      this.canvas.height = exportSettings.resolution.height;
      this.ctx = this.canvas.getContext('2d');
      
      if (!this.ctx) return null;
      
      // Trier la timeline
      const sortedTimeline = [...timeline].sort((a, b) => a.startTime - b.startTime);
      
      // Pour l'instant, créer une image composite simple
      const frames: string[] = [];
      
      for (const item of sortedTimeline) {
        const media = mediaFiles.find(m => m.id === item.mediaId);
        if (!media) continue;
        
        if (media.type === 'image') {
          await this.drawImageFrame(media, item.duration);
          const dataUrl = this.canvas.toDataURL('image/png');
          frames.push(dataUrl);
        } else if (media.type === 'video') {
          // Pour les vidéos, prendre une capture d'écran
          await this.drawVideoFrame(media);
          const dataUrl = this.canvas.toDataURL('image/png');
          frames.push(dataUrl);
        }
      }
      
      // Si on a des frames, retourner au moins le premier comme image
      if (frames.length > 0) {
        // Créer un GIF animé ou une vidéo WebM simple
        return this.createAnimatedImage(frames);
      }
      
      return null;
    } catch (error) {
      console.error('Error creating simple video:', error);
      return null;
    }
  }
  
  private async drawImageFrame(media: MediaFile, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (!this.ctx || !this.canvas) {
          resolve();
          return;
        }
        
        // Effacer le canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculer les dimensions pour garder le ratio
        const scale = Math.min(
          this.canvas.width / img.width,
          this.canvas.height / img.height
        );
        
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (this.canvas.width - width) / 2;
        const y = (this.canvas.height - height) / 2;
        
        // Dessiner l'image
        this.ctx.drawImage(img, x, y, width, height);
        
        // Ajouter un watermark
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Duration: ${duration}s`, 10, this.canvas.height - 10);
        
        resolve();
      };
      
      img.onerror = () => resolve();
      img.src = media.url;
    });
  }
  
  private async drawVideoFrame(media: MediaFile): Promise<void> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.muted = true;
      
      video.onseeked = () => {
        if (!this.ctx || !this.canvas) {
          resolve();
          return;
        }
        
        // Effacer le canvas
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculer les dimensions pour garder le ratio
        const scale = Math.min(
          this.canvas.width / video.videoWidth,
          this.canvas.height / video.videoHeight
        );
        
        const width = video.videoWidth * scale;
        const height = video.videoHeight * scale;
        const x = (this.canvas.width - width) / 2;
        const y = (this.canvas.height - height) / 2;
        
        // Dessiner la vidéo
        this.ctx.drawImage(video, x, y, width, height);
        
        URL.revokeObjectURL(video.src);
        video.remove();
        resolve();
      };
      
      video.onerror = () => {
        resolve();
      };
      
      video.src = media.url;
      video.currentTime = 1; // Prendre une frame à 1 seconde
    });
  }
  
  private async createAnimatedImage(frames: string[]): Promise<Blob> {
    // Pour l'instant, retourner juste la première frame comme image PNG
    // Dans une vraie implémentation, on pourrait créer un GIF animé
    const firstFrame = frames[0];
    const response = await fetch(firstFrame);
    return response.blob();
  }
  
  async createVideoFromTimeline(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[],
    exportSettings: ExportSettings
  ): Promise<Blob | null> {
    // Méthode simplifiée qui combine les médias
    if (timeline.length === 0) return null;
    
    // Trouver le premier média vidéo ou image
    const firstItem = timeline[0];
    const firstMedia = mediaFiles.find(m => m.id === firstItem.mediaId);
    
    if (!firstMedia) return null;
    
    // Si c'est déjà une vidéo, la retourner
    if (firstMedia.type === 'video') {
      return firstMedia.file;
    }
    
    // Si c'est une image, créer une vidéo simple
    if (firstMedia.type === 'image') {
      return this.createSimpleVideo(mediaFiles, timeline, exportSettings);
    }
    
    return null;
  }
}

const canvasVideoService = new CanvasVideoService();
export default canvasVideoService;