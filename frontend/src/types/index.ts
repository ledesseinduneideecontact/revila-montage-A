export type MediaType = 'image' | 'video' | 'audio';

export interface MediaFile {
  id: string;
  file: File;
  type: MediaType;
  url: string;
  duration?: number;
  thumbnail?: string;
  name: string;
}

export interface TimelineItem {
  id: string;
  mediaId: string;
  startTime: number;
  endTime: number;
  duration: number;
  transition?: TransitionType;
  transitionDuration?: number;
}

export type TransitionType = 'none' | 'crossfade' | 'fade' | 'slide-left' | 'slide-right' | 'wipe' | 'cut';

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  videoVolume: number;
  mixMode: 'mix' | 'replace';
}

export interface ExportSettings {
  format: 'mp4' | 'webm';
  quality: 'HD' | 'Full HD';
  resolution: {
    width: number;
    height: number;
  };
  preset: 'fast' | 'medium' | 'slow';
}

export interface Project {
  id: string;
  name: string;
  mediaFiles: MediaFile[];
  timeline: TimelineItem[];
  audioSettings: AudioSettings;
  exportSettings: ExportSettings;
  createdAt: Date;
  updatedAt: Date;
}