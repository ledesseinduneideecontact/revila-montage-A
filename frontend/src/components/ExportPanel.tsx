import React, { useState } from 'react';
import { Download, Settings, AlertCircle } from 'lucide-react';
import { ExportSettings } from '../types';

interface ExportPanelProps {
  exportSettings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: () => void;
  isExporting: boolean;
  progress: number;
  canExport: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  exportSettings,
  onSettingsChange,
  onExport,
  isExporting,
  progress,
  canExport,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleFormatChange = (format: 'mp4' | 'webm') => {
    onSettingsChange({ ...exportSettings, format });
  };

  const handleQualityChange = (quality: 'HD' | 'Full HD') => {
    const resolution = quality === 'HD' 
      ? { width: 1280, height: 720 }
      : { width: 1920, height: 1080 };
    onSettingsChange({ ...exportSettings, quality, resolution });
  };

  const handlePresetChange = (preset: 'fast' | 'medium' | 'slow') => {
    onSettingsChange({ ...exportSettings, preset });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Export Video</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {!canExport && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-800">Timeline is empty</p>
              <p className="text-xs text-yellow-700 mt-1">
                Add media files to the timeline before exporting
              </p>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="bg-white rounded-lg p-4 mb-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleFormatChange('mp4')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.format === 'mp4'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                MP4
              </button>
              <button
                onClick={() => handleFormatChange('webm')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.format === 'webm'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                WebM
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Quality</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleQualityChange('HD')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.quality === 'HD'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                HD (720p)
              </button>
              <button
                onClick={() => handleQualityChange('Full HD')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.quality === 'Full HD'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Full HD (1080p)
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Encoding Speed</label>
            <div className="flex gap-2">
              <button
                onClick={() => handlePresetChange('fast')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.preset === 'fast'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Fast
              </button>
              <button
                onClick={() => handlePresetChange('medium')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.preset === 'medium'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Medium
              </button>
              <button
                onClick={() => handlePresetChange('slow')}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  exportSettings.preset === 'slow'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                Best Quality
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {exportSettings.preset === 'fast' && 'Faster encoding, larger file size'}
              {exportSettings.preset === 'medium' && 'Balanced speed and quality'}
              {exportSettings.preset === 'slow' && 'Best compression, slower encoding'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg p-4">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-600">Format:</span>
          <span className="font-medium">{exportSettings.format.toUpperCase()}</span>
        </div>
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-600">Resolution:</span>
          <span className="font-medium">{exportSettings.resolution.width}x{exportSettings.resolution.height}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-gray-600">Preset:</span>
          <span className="font-medium capitalize">{exportSettings.preset}</span>
        </div>

        {isExporting && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2 text-center">
              Processing... {Math.round(progress)}%
            </p>
          </div>
        )}

        <button
          onClick={onExport}
          disabled={!canExport || isExporting}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            canExport && !isExporting
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export Video
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;