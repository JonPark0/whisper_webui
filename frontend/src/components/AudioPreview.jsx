import { useState, useRef, useEffect } from 'react';

export const AudioPreview = ({ filename, duration, onTimeRangeChange }) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(duration || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (duration) {
      setEndTime(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (onTimeRangeChange) {
      onTimeRangeChange({
        start: startTime,
        end: endTime,
      });
    }
  }, [startTime, endTime, onTimeRangeChange]);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.currentTime = startTime;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;

    if (audioRef.current.currentTime >= endTime) {
      audioRef.current.pause();
      setIsPlaying(false);
      audioRef.current.currentTime = startTime;
    }
  };

  return (
    <div className="w-full p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Audio Preview</h3>

      <div className="space-y-4">
        {/* Audio Player */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <button
            onClick={handlePlayPause}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          >
            {isPlaying ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">{filename}</p>
            <p className="text-xs text-gray-500">
              Duration: {formatTime(duration)}
            </p>
          </div>

          <audio
            ref={audioRef}
            src={`/api/uploads/${filename}`}
            onEnded={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>

        {/* Time Range Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Start Time</label>
              <span className="text-sm text-gray-600">{formatTime(startTime)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="1"
              value={startTime}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value < endTime) {
                  setStartTime(value);
                }
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">End Time</label>
              <span className="text-sm text-gray-600">{formatTime(endTime)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="1"
              value={endTime}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (value > startTime) {
                  setEndTime(value);
                }
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* Selected Range Display */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Selected range:</span> {formatTime(startTime)} - {formatTime(endTime)}
            {' '}
            <span className="text-blue-600">
              ({formatTime(endTime - startTime)} duration)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
