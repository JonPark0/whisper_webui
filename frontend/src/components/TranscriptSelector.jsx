import { useJobs } from '../hooks/useJobs';

export const TranscriptSelector = ({ onSelect, selectedJobIds = [], selectedJobId, multiSelect = false }) => {
  const { jobs, loading, error } = useJobs({
    job_type: 'transcribe',
    status: 'completed',
    archived: 0,
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
    // Parse UTC datetime and convert to local timezone
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
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
    <div className="w-full border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12">
                {multiSelect ? (
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300"
                    checked={availableJobs.length > 0 && selectedJobIds.length === availableJobs.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        availableJobs.forEach(job => {
                          if (!selectedJobIds.includes(job.id)) {
                            onSelect(job.id);
                          }
                        });
                      } else {
                        selectedJobIds.forEach(id => onSelect(id));
                      }
                    }}
                  />
                ) : (
                  <span className="sr-only">Select</span>
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                File
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Completed
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Range
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Options
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {availableJobs.map((job) => (
              <tr
                key={job.id}
                onClick={() => onSelect(job.id)}
                className={`cursor-pointer transition-colors ${
                  isSelected(job.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3 text-sm">
                  <div
                    className={`${multiSelect ? 'w-4 h-4 rounded border-2' : 'w-4 h-4 rounded-full border-2'} flex items-center justify-center ${
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
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="font-mono text-gray-600">#{job.id}</span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="max-w-xs truncate text-gray-900 font-medium" title={job.input_file}>
                    {job.input_file.split('/').pop()}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDate(job.completed_at)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDuration(job.start_time, job.end_time)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {job.enable_timestamp && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        Timestamps
                      </span>
                    )}
                    {job.translate_to && (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {job.translate_to}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
