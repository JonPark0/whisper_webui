import { useRef } from 'react';
import { useJobs } from '../hooks/useJobs';
import JobTable from '../components/JobTable';

export default function ArchivePage() {
  const { jobs, loading, error, refetch } = useJobs({ archived: 1 });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Archive</h1>
          <p className="text-gray-600">
            Archived transcription and enhancement jobs. Restore or permanently delete them.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && jobs.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <JobTable
            jobs={jobs}
            onJobUpdate={refetch}
            showArchive={false}
            showUnarchive={true}
          />
        )}

        {/* Info banner */}
        {jobs.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 text-sm text-blue-800">
                <p className="font-medium mb-1">Archive Management</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Archived jobs are hidden from the main Transcribe and Enhance tabs</li>
                  <li>Use the restore button to move jobs back to active status</li>
                  <li>Deleted archived jobs cannot be recovered</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
