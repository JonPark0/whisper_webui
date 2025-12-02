import { useJobs } from '../hooks/useJobs';

export const TranscriptSelector = ({ onSelect, selectedJobIds = [], selectedJobId, multiSelect = false }) => {
  const { jobs, loading, error } = useJobs({
    job_type: 'transcribe',
    status: 'completed',
  });

  // Filter out jobs that were auto-enhanced
  const availableJobs = jobs.filter((job) => !job.auto_enhance);

  // Support both single and multi-select modes
  const isSelected = (jobId) => {
    if (multiSelect) {
      return selectedJobIds.includes(jobId);
    }
    return selectedJobId === jobId;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (start, end, duration) => {
    if (start || end) {
      return `${start || 0}s - ${end || duration || 0}s`;
    }
    return 'Full audio';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Error: {error}</p>
      </div>
    );
  }

  if (availableJobs.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm font-medium text-gray-700">No transcripts available</p>
        <p className="text-xs text-gray-500 mt-1">
          Complete a transcription job first, or jobs that were auto-enhanced are not shown here
        </p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        {multiSelect ? 'Select Transcripts to Enhance' : 'Select Transcript to Enhance'}
      </h3>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {availableJobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelect(job.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              isSelected(job.id)
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500">#{job.id}</span>
                  {isSelected(job.id) && (
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  )}
                </div>

                <p className="text-sm font-medium text-gray-800 mb-1">
                  {job.input_file.split('/').pop()}
                </p>

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Completed: {formatDate(job.completed_at)}</p>
                  <p>Range: {formatDuration(job.start_time, job.end_time)}</p>
                </div>

                {/* Tags */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.enable_timestamp && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      Timestamps
                    </span>
                  )}
                  {job.translate_to && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {job.translate_to}
                    </span>
                  )}
                </div>
              </div>

              <div
                className={`${multiSelect ? 'w-5 h-5 rounded border-2' : 'w-5 h-5 rounded-full border-2'} flex items-center justify-center ${
                  isSelected(job.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {isSelected(job.id) && (
                  multiSelect ? (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
