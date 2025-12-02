import { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const TranscriptViewer = ({ jobId, onClose }) => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segments, setSegments] = useState([]);
  const [isSeeking, setIsSeeking] = useState(false);
  const audioRef = useRef(null);
  const segmentRefs = useRef({});

  // Load result
  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);
        const data = await apiService.getJobResult(jobId);
        setResult(data);

        // Parse timestamps from content
        if (data.has_timestamps) {
          const parsed = parseTimestamps(data.content);
          setSegments(parsed);
        }
      } catch (err) {
        setError(err.response?.data?.detail || err.message || 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [jobId]);

  // Parse timestamps from markdown content
  const parseTimestamps = (content) => {
    const lines = content.split('\n');
    const segments = [];
    let id = 0;

    // Regex to match timestamps: [HH:MM:SS - HH:MM:SS] text
    const timestampRegex = /^\[(\d{2}:\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}:\d{2})\]\s*(.+)$/;

    for (const line of lines) {
      const match = line.match(timestampRegex);
      if (match) {
        const [, startStr, endStr, text] = match;
        segments.push({
          id: id++,
          start: timeToSeconds(startStr),
          end: timeToSeconds(endStr),
          text: text.trim(),
          originalLine: line,
        });
      }
    }

    return segments;
  };

  // Convert HH:MM:SS to seconds
  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  // Convert seconds to HH:MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Handle audio time update
  const handleTimeUpdate = () => {
    // Don't update currentTime if user is dragging the seek bar
    if (isSeeking || !audioRef.current) return;

    const time = audioRef.current.currentTime;
    setCurrentTime(time);

    // Auto-scroll to current segment
    const currentSegment = segments.find(seg => time >= seg.start && time < seg.end);
    if (currentSegment && segmentRefs.current[currentSegment.id]) {
      segmentRefs.current[currentSegment.id].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  // Handle play/pause
  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Handle segment click - jump to that time
  const handleSegmentClick = (segment) => {
    if (audioRef.current && !isNaN(segment.start)) {
      audioRef.current.currentTime = segment.start;
      setCurrentTime(segment.start);
      if (!isPlaying) {
        audioRef.current.play().catch(err => console.error('Play failed:', err));
        setIsPlaying(true);
      }
    }
  };

  // Handle audio loaded metadata
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Handle seek start (mousedown on range input)
  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  // Handle seek change (while dragging)
  const handleSeekChange = (e) => {
    const time = parseFloat(e.target.value);
    if (!isNaN(time)) {
      setCurrentTime(time);
    }
  };

  // Handle seek end (mouseup on range input)
  const handleSeekEnd = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current && !isNaN(time)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
    setIsSeeking(false);
  };

  // Check if segment is currently playing
  const isSegmentActive = (segment) => {
    return currentTime >= segment.start && currentTime < segment.end;
  };

  // Download result
  const handleDownload = async () => {
    try {
      const blob = await apiService.downloadResult(jobId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${result.filename.replace(/\.[^/.]+$/, '')}_transcript.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transcript...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <p className="text-center text-gray-800 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Transcript Result</h2>
            <p className="text-sm text-gray-600 mt-1">{result.filename}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
            </svg>
          </button>
        </div>

        {/* Audio Player (if has timestamps) */}
        {result.has_timestamps && segments.length > 0 && (
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onMouseDown={handleSeekStart}
                  onTouchStart={handleSeekStart}
                  onChange={handleSeekChange}
                  onMouseUp={handleSeekEnd}
                  onTouchEnd={handleSeekEnd}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <audio
                ref={audioRef}
                src={result.audio_url}
                onLoadedMetadata={handleLoadedMetadata}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            <div className="mt-3 text-xs text-gray-500 text-center">
              Click on any text segment to jump to that timestamp
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {result.has_timestamps && segments.length > 0 ? (
            // Render with timestamps
            <div className="space-y-3">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  ref={(el) => (segmentRefs.current[segment.id] = el)}
                  onClick={() => handleSegmentClick(segment)}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    isSegmentActive(segment)
                      ? 'bg-blue-50 border-blue-500 shadow-md'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <span
                        className={`text-xs font-mono px-2 py-1 rounded ${
                          isSegmentActive(segment)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {formatTime(segment.start)}
                      </span>
                    </div>
                    <p
                      className={`flex-1 ${
                        isSegmentActive(segment)
                          ? 'text-gray-900 font-medium'
                          : 'text-gray-700'
                      }`}
                    >
                      {segment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Render Markdown (no timestamps - likely enhanced result)
            <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDownload}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            Download
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
