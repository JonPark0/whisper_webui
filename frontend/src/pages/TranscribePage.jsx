import { useState, useRef } from 'react';
import { AudioUploader } from '../components/AudioUploader';
import { TranscribeOptions } from '../components/TranscribeOptions';
import { JobQueue } from '../components/JobQueue';
import { apiService } from '../services/api';

export const TranscribePage = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [transcribeOptions, setTranscribeOptions] = useState({});
  const [submittingJobs, setSubmittingJobs] = useState({});
  const [error, setError] = useState(null);
  const jobQueueRefetchRef = useRef(null);

  const handleUploadSuccess = (fileInfo) => {
    // Add new file to the list
    setUploadedFiles(prev => {
      // Check if file already exists
      const exists = prev.some(f => f.filename === fileInfo.filename);
      if (exists) return prev;
      return [...prev, fileInfo];
    });
    setError(null);
  };

  const handleSubmitSingle = async (fileInfo) => {
    setSubmittingJobs(prev => ({ ...prev, [fileInfo.filename]: true }));
    setError(null);

    try {
      const requestData = {
        ...transcribeOptions,
        start_time: null,
        end_time: null,
      };

      await apiService.createTranscribeJob(fileInfo.filename, requestData);

      // Remove file from uploaded list
      setUploadedFiles(prev => prev.filter(f => f.filename !== fileInfo.filename));

      // Immediately refresh job queue to show the new job
      if (jobQueueRefetchRef.current) {
        jobQueueRefetchRef.current();
      }

    } catch (err) {
      setError(`${fileInfo.filename}: ${err.response?.data?.detail || err.message || 'Failed to create job'}`);
    } finally {
      setSubmittingJobs(prev => {
        const newState = { ...prev };
        delete newState[fileInfo.filename];
        return newState;
      });
    }
  };

  const handleSubmitAll = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload audio files first');
      return;
    }

    // Submit all files sequentially
    for (const fileInfo of uploadedFiles) {
      await handleSubmitSingle(fileInfo);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Transcribe Audio</h1>
        <p className="text-gray-600">
          Upload audio files and convert them to text using Whisper AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Upload Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Upload Audio</h2>
            <AudioUploader onUploadSuccess={handleUploadSuccess} />
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                2. Uploaded Files ({uploadedFiles.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.filename}
                    className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {file.filename.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(file.duration)}s
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {submittingJobs[file.filename] ? (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" />
                          </svg>
                          Adding...
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSubmitSingle(file)}
                          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                        >
                          Add to Queue
                        </button>
                      )}
                      <button
                        onClick={() => setUploadedFiles(prev => prev.filter(f => f.filename !== file.filename))}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        disabled={submittingJobs[file.filename]}
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Options Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              2. Configure Options
            </h2>
            <TranscribeOptions onChange={setTranscribeOptions} />
          </div>

          {/* Batch Submit Button */}
          {uploadedFiles.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                3. Batch Actions
              </h2>
              <button
                onClick={handleSubmitAll}
                disabled={Object.keys(submittingJobs).length > 0}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {Object.keys(submittingJobs).length > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" />
                    </svg>
                    Adding {Object.keys(submittingJobs).length} to Queue...
                  </span>
                ) : (
                  `Add All ${uploadedFiles.length} Files to Queue`
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Queue Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Processing Queue</h2>
        <JobQueue
          jobType="transcribe"
          onRefetchReady={(refetch) => {
            jobQueueRefetchRef.current = refetch;
          }}
        />
      </div>
    </div>
  );
};
