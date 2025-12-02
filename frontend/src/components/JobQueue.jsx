import { useState, useEffect } from 'react';
import { useJobs } from '../hooks/useJobs';
import { apiService } from '../services/api';
import { TranscriptViewer } from './TranscriptViewer';

export const JobQueue = ({ jobType = 'transcribe', onRefetchReady }) => {
  const { jobs, loading, error, refetch } = useJobs({ job_type: jobType });
  const [downloading, setDownloading] = useState({});
  const [viewingJobId, setViewingJobId] = useState(null);

  // Pass refetch function to parent component
  useEffect(() => {
    if (onRefetchReady && refetch) {
      onRefetchReady(refetch);
    }
  }, [refetch, onRefetchReady]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleDownload = async (job) => {
    setDownloading({ ...downloading, [job.id]: true });

    try {
      const blob = await apiService.downloadResult(job.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.input_file.split('/').pop().replace(/\.[^/.]+$/, '')}_transcript.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading({ ...downloading, [job.id]: false });
    }
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job?')) return;

    try {
      await apiService.deleteJob(jobId);
      refetch();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading && jobs.length === 0) {
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

  if (jobs.length === 0) {
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
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">No jobs yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(job.status)}`}>
                  {getStatusIcon(job.status)}
                  {job.status.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500">
                  #{job.id}
                </span>
              </div>

              <p className="text-sm font-medium text-gray-800 mb-1">
                {job.input_file.split('/').pop()}
              </p>

              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {formatDate(job.created_at)}</p>
                {job.completed_at && (
                  <p>Completed: {formatDate(job.completed_at)}</p>
                )}
              </div>

              {/* Progress Bar */}
              {job.status === 'processing' && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Processing...</span>
                    <span>{Math.round(job.progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error Message */}
              {job.status === 'failed' && job.error_message && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <p className="text-xs text-red-600">{job.error_message}</p>
                </div>
              )}

              {/* Options Info */}
              <div className="mt-2 flex flex-wrap gap-2">
                {job.enable_timestamp && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    Timestamps
                  </span>
                )}
                {job.translate_to && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    Translate: {job.translate_to}
                  </span>
                )}
                {job.enable_chunked && (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                    Chunked
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {job.status === 'completed' && (
                <>
                  <button
                    onClick={() => setViewingJobId(job.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View Result"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDownload(job)}
                    disabled={downloading[job.id]}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Download"
                  >
                    {downloading[job.id] ? (
                      <svg className="w-5 h-5 animate-spin" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                      </svg>
                    )}
                  </button>
                </>
              )}

              <button
                onClick={() => handleDelete(job.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Transcript Viewer Modal */}
      {viewingJobId && (
        <TranscriptViewer
          jobId={viewingJobId}
          onClose={() => setViewingJobId(null)}
        />
      )}
    </div>
  );
};
