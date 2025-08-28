import React, { useRef } from 'react';
import { Volume2, Music, Film, Upload, X } from 'lucide-react';
import { AudioSettings, MediaFile } from '../types';

interface AudioControlsProps {
  audioSettings: AudioSettings;
  onSettingsChange: (settings: AudioSettings) => void;
  audioFile: MediaFile | undefined;
  onAudioUpload?: (file: File) => void;
  onAudioRemove?: () => void;
}

const AudioControls: React.FC<AudioControlsProps> = ({ 
  audioSettings, 
  onSettingsChange, 
  audioFile, 
  onAudioUpload,
  onAudioRemove 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleVolumeChange = (key: keyof AudioSettings, value: number) => {
    onSettingsChange({
      ...audioSettings,
      [key]: value,
    });
  };

  const handleMixModeChange = (mode: 'mix' | 'replace') => {
    onSettingsChange({
      ...audioSettings,
      mixMode: mode,
    });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Audio Settings</h2>

      {audioFile ? (
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Background Music</p>
                  <p className="text-xs text-gray-500">{audioFile.name}</p>
                </div>
              </div>
              {onAudioRemove && (
                <button
                  onClick={onAudioRemove}
                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                  title="Remove audio"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Volume2 className="w-4 h-4" />
              Master Volume
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={audioSettings.masterVolume}
              onChange={(e) => handleVolumeChange('masterVolume', Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{audioSettings.masterVolume}%</span>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Music className="w-4 h-4" />
              Music Volume
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={audioSettings.musicVolume}
              onChange={(e) => handleVolumeChange('musicVolume', Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{audioSettings.musicVolume}%</span>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Film className="w-4 h-4" />
              Video Audio Volume
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={audioSettings.videoVolume}
              onChange={(e) => handleVolumeChange('videoVolume', Number(e.target.value))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{audioSettings.videoVolume}%</span>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Mix Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleMixModeChange('mix')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  audioSettings.mixMode === 'mix'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mix Audio
              </button>
              <button
                onClick={() => handleMixModeChange('replace')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  audioSettings.mixMode === 'replace'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Replace Audio
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {audioSettings.mixMode === 'mix' 
                ? 'Combines background music with video audio'
                : 'Replaces video audio with background music'}
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <Music className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No background music added</p>
          <p className="text-sm text-gray-400 mt-1 mb-3">
            Upload an audio file to add background music
          </p>
          {onAudioUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onAudioUpload(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Audio
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AudioControls;