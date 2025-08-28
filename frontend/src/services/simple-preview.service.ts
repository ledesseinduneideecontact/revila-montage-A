import { MediaFile, TimelineItem } from '../types';

class SimplePreviewService {
  async generatePreview(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[]
  ): Promise<string | null> {
    if (timeline.length === 0) return null;

    const sortedTimeline = [...timeline].sort((a, b) => a.startTime - b.startTime);
    const firstItem = sortedTimeline[0];
    const firstMedia = mediaFiles.find(m => m.id === firstItem.mediaId);

    if (!firstMedia) return null;

    // Pour une preview simple, retourner juste le premier média
    if (firstMedia.type === 'video' || firstMedia.type === 'image') {
      return URL.createObjectURL(firstMedia.file);
    }

    // Si c'est de l'audio seulement, créer une visualisation simple
    if (firstMedia.type === 'audio') {
      return this.createAudioVisualization();
    }

    return null;
  }

  private createAudioVisualization(): string {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';

    // Fond noir avec visualisation audio
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texte au centre
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎵 Audio Track', canvas.width / 2, canvas.height / 2 - 50);
    
    // Barres de visualisation
    const barCount = 30;
    const barWidth = canvas.width / barCount;
    
    for (let i = 0; i < barCount; i++) {
      const height = Math.random() * 200 + 50;
      const hue = (i / barCount) * 360;
      
      ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.fillRect(
        i * barWidth + 2, 
        canvas.height / 2 + 50 + (250 - height) / 2, 
        barWidth - 4, 
        height
      );
    }

    return canvas.toDataURL('image/png');
  }

  async combineMediaFiles(
    mediaFiles: MediaFile[],
    timeline: TimelineItem[]
  ): Promise<Blob | null> {
    // Cette méthode pourrait être implémentée avec Canvas API
    // pour créer une vidéo simple, mais pour l'instant
    // on retourne null car c'est complexe sans FFmpeg
    return null;
  }
}

const simplePreviewService = new SimplePreviewService();
export default simplePreviewService;