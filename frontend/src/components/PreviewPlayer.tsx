import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Maximize2 } from 'lucide-react';

interface PreviewPlayerProps {
  videoUrl: string | null;
  isProcessing: boolean;
}

const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ videoUrl, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      videoRef.current.load();
      setIsPlaying(false);
    }
  }, [videoUrl]);

  const togglePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = Number(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Preview</h2>

      <div className="bg-black rounded-lg overflow-hidden">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-96 object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            <div className="bg-gray-900 p-4">
              <div className="mb-3">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={handleRestart}
                  className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button
                  onClick={handleFullscreen}
                  className="p-2 text-white hover:bg-gray-700 rounded transition-colors"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-96">
            {isProcessing ? (
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p className="text-white mt-4">Processing video...</p>
              </div>
            ) : (
              <div className="text-center">
                <Play className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No preview available</p>
                <p className="text-sm text-gray-500 mt-2">
                  Export your timeline to generate a preview
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewPlayer;