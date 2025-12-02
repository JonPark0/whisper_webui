import { useState, useRef } from 'react';
import { TranscriptSelector } from '../components/TranscriptSelector';
import { EnhanceOptions } from '../components/EnhanceOptions';
import { JobQueue } from '../components/JobQueue';
import { apiService } from '../services/api';

export const EnhancePage = () => {
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  const [enhanceOptions, setEnhanceOptions] = useState({});
  const [submittingJobs, setSubmittingJobs] = useState({});
  const [error, setError] = useState(null);
  const jobQueueRefetchRef = useRef(null);

  const handleSelect = (jobId) => {
    setSelectedJobIds(prev => {
      if (prev.includes(jobId)) {
        return prev.filter(id => id !== jobId);
      }
      return [...prev, jobId];
    });
  };

  const handleSubmitSingle = async (jobId) => {
    setSubmittingJobs(prev => ({ ...prev, [jobId]: true }));
    setError(null);

    try {
      await apiService.createEnhanceJob(jobId, enhanceOptions);

      // Remove from selection
      setSelectedJobIds(prev => prev.filter(id => id !== jobId));

      // Immediately refresh job queue to show the new job
      if (jobQueueRefetchRef.current) {
        jobQueueRefetchRef.current();
      }

    } catch (err) {
      setError(`Job #${jobId}: ${err.response?.data?.detail || err.message || 'Failed to create enhancement job'}`);
    } finally {
      setSubmittingJobs(prev => {
        const newState = { ...prev };
        delete newState[jobId];
        return newState;
      });
    }
  };

  const handleSubmitAll = async () => {
    if (selectedJobIds.length === 0) {
      setError('Please select transcripts to enhance');
      return;
    }

    // Submit all selected jobs sequentially
    for (const jobId of selectedJobIds) {
      await handleSubmitSingle(jobId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhance Transcript</h1>
        <p className="text-gray-600">
          Improve transcript quality using Gemini AI
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Transcript Selection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              1. Select Transcripts {selectedJobIds.length > 0 && `(${selectedJobIds.length} selected)`}
            </h2>
            <TranscriptSelector
              onSelect={handleSelect}
              selectedJobIds={selectedJobIds}
              multiSelect={true}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Enhancement Options */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              2. Configure Enhancement
            </h2>
            <EnhanceOptions onChange={setEnhanceOptions} />
          </div>

          {/* Submit Button */}
          {selectedJobIds.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                3. Add to Queue
              </h2>
              <button
                onClick={handleSubmitAll}
                disabled={Object.keys(submittingJobs).length > 0}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {Object.keys(submittingJobs).length > 0 ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" />
                    </svg>
                    Adding {Object.keys(submittingJobs).length} to Queue...
                  </span>
                ) : (
                  selectedJobIds.length === 1
                    ? 'Enhance Transcript'
                    : `Enhance ${selectedJobIds.length} Transcripts`
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
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Enhancement Queue</h2>
        <JobQueue
          jobType="enhance"
          onRefetchReady={(refetch) => {
            jobQueueRefetchRef.current = refetch;
          }}
        />
      </div>
    </div>
  );
};
