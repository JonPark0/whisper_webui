import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { apiService } from '../services/api';
import { TranscriptViewer } from './TranscriptViewer';

const JobTable = ({ jobs, onJobUpdate, showArchive = false, showUnarchive = false }) => {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Helper functions
  const getStatusBadgeClass = (status) => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-gray-200 text-gray-700`;
      case 'processing':
        return `${baseClasses} bg-blue-200 text-blue-700 animate-pulse`;
      case 'completed':
        return `${baseClasses} bg-green-200 text-green-700`;
      case 'failed':
        return `${baseClasses} bg-red-200 text-red-700`;
      default:
        return baseClasses;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    // Parse UTC datetime and convert to local timezone
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getFilename = (inputFile) => {
    if (!inputFile) return '-';
    return inputFile.split('/').pop().split('_')[0] || inputFile;
  };

  // Actions
  const handleView = (job) => {
    if (job.status !== 'completed') return;
    setSelectedJob(job);
    setIsViewerOpen(true);
  };

  const handleDownload = async (job) => {
    if (job.status !== 'completed') return;
    try {
      const blob = await apiService.downloadResult(job.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getFilename(job.input_file)}_${job.id}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('Failed to download transcript');
    }
  };

  const handleDelete = async (job) => {
    if (!confirm(`Delete job #${job.id}? This cannot be undone.`)) return;
    try {
      await apiService.deleteJob(job.id);
      if (onJobUpdate) onJobUpdate();
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete job');
    }
  };

  const handleArchive = async (job) => {
    try {
      await apiService.archiveJob(job.id);
      if (onJobUpdate) onJobUpdate();
    } catch (error) {
      console.error('Failed to archive:', error);
      alert('Failed to archive job');
    }
  };

  const handleUnarchive = async (job) => {
    try {
      await apiService.unarchiveJob(job.id);
      if (onJobUpdate) onJobUpdate();
    } catch (error) {
      console.error('Failed to unarchive:', error);
      alert('Failed to unarchive job');
    }
  };

  // Table columns
  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 60,
        cell: ({ getValue }) => <span className="font-mono text-sm">#{getValue()}</span>,
      },
      {
        accessorKey: 'job_type',
        header: 'Type',
        size: 100,
        cell: ({ getValue }) => (
          <span className="capitalize">{getValue()}</span>
        ),
      },
      {
        accessorKey: 'input_file',
        header: 'File',
        size: 200,
        cell: ({ getValue }) => (
          <span className="truncate block max-w-[200px]" title={getValue()}>
            {getFilename(getValue())}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 100,
        cell: ({ getValue }) => (
          <span className={getStatusBadgeClass(getValue())}>
            {getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'progress',
        header: 'Progress',
        size: 150,
        cell: ({ getValue, row }) => {
          const progress = getValue();
          const status = row.original.status;
          if (status === 'pending') return <span className="text-gray-500">Queued</span>;
          if (status === 'failed') return <span className="text-red-600">Error</span>;
          return (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-gray-600">{Math.round(progress)}%</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        size: 100,
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-600">{formatDate(getValue())}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 200,
        cell: ({ row }) => {
          const job = row.original;
          const isCompleted = job.status === 'completed';

          return (
            <div className="flex gap-1">
              {/* View */}
              <button
                onClick={() => handleView(job)}
                disabled={!isCompleted}
                className={`p-1.5 rounded hover:bg-gray-100 ${
                  !isCompleted ? 'opacity-30 cursor-not-allowed' : ''
                }`}
                title="View transcript"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>

              {/* Download */}
              <button
                onClick={() => handleDownload(job)}
                disabled={!isCompleted}
                className={`p-1.5 rounded hover:bg-gray-100 ${
                  !isCompleted ? 'opacity-30 cursor-not-allowed' : ''
                }`}
                title="Download transcript"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>

              {/* Archive/Unarchive */}
              {showArchive && (
                <button
                  onClick={() => handleArchive(job)}
                  className="p-1.5 rounded hover:bg-gray-100"
                  title="Archive job"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              )}

              {showUnarchive && (
                <button
                  onClick={() => handleUnarchive(job)}
                  className="p-1.5 rounded hover:bg-gray-100"
                  title="Restore from archive"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </button>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(job)}
                className="p-1.5 rounded hover:bg-red-100 text-red-600"
                title="Delete job"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        },
      },
    ],
    [showArchive, showUnarchive]
  );

  // Table instance
  const table = useReactTable({
    data: jobs,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search jobs..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="text-sm text-gray-600">
          {table.getFilteredRowModel().rows.length} of {jobs.length} jobs
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      style={{ width: header.column.getSize() }}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getIsSorted() && (
                          <span className="text-blue-600">
                            {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-sm text-gray-900"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state */}
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No jobs found</p>
          </div>
        )}
      </div>

      {/* Transcript Viewer Modal */}
      {isViewerOpen && selectedJob && (
        <TranscriptViewer
          jobId={selectedJob.id}
          onClose={() => {
            setIsViewerOpen(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

export default JobTable;
