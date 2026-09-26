import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useDebounced, useJobs, useNow } from '../hooks/useJobs';
import { downloadBlob, errorText, jobTitle, stem } from '../lib/format';
import { JobItem } from './JobItem';
import { Alert } from './ui/Alert';
import { useConfirm } from './ui/Dialog';
import { SearchField } from './ui/Field';
import { Pagination } from './ui/Pagination';
import { Section } from './layout/PageSplit';

const PAGE_SIZE = 10;

/**
 * Titled, searchable, paginated job list in the Figma "Queue" layout.
 * mode: 'active' (Archive action) | 'archive' (Restore action).
 */
export const JobList = ({ title, jobType, mode = 'active', emptyText, onRefetchReady, runningCount = 0 }) => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const now = useNow();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  const q = useDebounced(search.trim());

  useEffect(() => { setPage(1); }, [q]);

  const filters = { archived: mode === 'archive' ? 1 : 0, ...(jobType ? { job_type: jobType } : {}), ...(q ? { q } : {}) };
  const { jobs, total, pageCount, loading, error, refetch } = useJobs(filters, { page, pageSize: PAGE_SIZE });

  useEffect(() => { onRefetchReady?.(refetch); }, [onRefetchReady, refetch]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const run = async (fn, failure) => {
    setActionError(null);
    try {
      await fn();
      refetch();
    } catch (err) {
      setActionError(errorText(err, failure));
    }
  };

  // Queue position for pending jobs: running jobs plus older pending jobs on
  // this page (the list is newest-first).
  const pendingOldestFirst = jobs.filter((j) => j.status === 'pending').map((j) => j.id).sort((a, b) => a - b);
  const jobsAhead = (job) => runningCount + pendingOldestFirst.indexOf(job.id);

  const handlers = {
    onView: (job) => navigate(`/jobs/${job.id}`),
    onDownload: (job) => run(async () => {
      const blob = await apiService.downloadResult(job.id);
      downloadBlob(blob, `${stem(jobTitle(job)).replace(' — clean-up', '_clean-up')}.md`);
    }, 'Download failed'),
    ...(mode === 'archive'
      ? { onRestore: (job) => run(() => apiService.unarchiveJob(job.id), 'Could not restore the job') }
      : { onArchive: (job) => run(() => apiService.archiveJob(job.id), 'Could not archive the job') }),
    onDelete: async (job) => {
      const ok = await confirm({
        title: `Delete job #${job.id}?`,
        body: job.status === 'completed'
          ? 'The transcript file is deleted permanently. This cannot be undone.'
          : 'The job is removed from the list. This cannot be undone.',
        confirmLabel: 'Delete',
        tone: 'danger',
      });
      if (ok) run(() => apiService.deleteJob(job.id), 'Could not delete the job');
    },
  };

  return (
    <Section
      title={title}
      actions={<SearchField value={search} onChange={setSearch} className="w-full max-w-[260px]" label={`Search ${title.toLowerCase()}`} />}
    >
      {actionError && <Alert tone="danger" title="Something went wrong" onDismiss={() => setActionError(null)}>{actionError}</Alert>}
      {error && <Alert tone="danger" title="Could not load jobs">{error}</Alert>}
      <div aria-busy={loading || undefined}>
        {jobs.map((job) => (
          <JobItem
            key={job.id}
            job={job}
            now={now}
            jobsAhead={job.status === 'pending' ? jobsAhead(job) : undefined}
            {...handlers}
          />
        ))}
        {!loading && jobs.length === 0 && (
          <p className="border-t border-line py-8 font-sans text-body text-ink-3">
            {q ? `No jobs match “${q}”.` : emptyText}
          </p>
        )}
        {jobs.length > 0 && <div className="border-t border-line" />}
      </div>
      <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      <p className="sr-only" aria-live="polite">{total} jobs</p>
    </Section>
  );
};
