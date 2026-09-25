import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { StatusBadge } from './ui/StatusBadge';
import { formatClock, formatSpan, jobTitle, parseUtc, relativeTime } from '../lib/format';

// One detail line, built only from what the API knows about the job.
const detailFor = (job, jobsAhead) => {
  switch (job.status) {
    case 'processing':
      return job.stage_message || `${Math.round(job.progress)}% done`;
    case 'pending':
      if (jobsAhead == null) return 'Waiting in the queue';
      return jobsAhead === 0 ? 'Next up' : `Waiting — ${jobsAhead} job${jobsAhead === 1 ? '' : 's'} ahead`;
    case 'completed': {
      const start = parseUtc(job.started_at);
      const end = parseUtc(job.completed_at);
      if (!start || !end) return 'Done';
      const took = (end - start) / 1000;
      // Wall time includes Gemini clean-up when enabled, so only quote a
      // realtime factor for plain transcription jobs.
      const speed = job.audio_duration && took > 0 && !job.auto_enhance
        ? ` · ${Math.round(job.audio_duration / took)}× realtime`
        : '';
      return `Done in ${formatSpan(took)}${speed}`;
    }
    case 'failed':
      return job.error_message || 'Failed without an error message';
    default:
      return '';
  }
};

const metaFor = (job, now) =>
  [
    job.audio_duration ? formatClock(job.audio_duration) : null,
    job.job_type === 'transcribe' && job.enable_timestamp ? 'Timestamps' : null,
    job.auto_enhance ? 'Gemini clean-up' : null,
    job.translate_to ? `→ ${job.translate_to}` : null,
    `#${job.id}`,
    relativeTime(job.created_at, now),
  ]
    .filter(Boolean)
    .join(' · ');

export const JobItem = ({ job, jobsAhead, now, title, onView, onDownload, onArchive, onRestore, onDelete }) => {
  const done = job.status === 'completed';
  const failed = job.status === 'failed';
  const name = title || jobTitle(job);
  return (
    <article className="border-t border-line py-5 flex flex-col gap-1.5" aria-label={name}>
      <div className="flex flex-wrap items-center gap-x-4">
        <h3 className="basis-full sm:basis-0 flex-1 min-w-0 font-display text-title font-light text-ink truncate" title={name}>{name}</h3>
        <div className="flex flex-wrap items-center gap-x-3.5 shrink-0">
          {done && onView && <Button variant="link" onClick={() => onView(job)}>View</Button>}
          {done && onDownload && <Button variant="link" onClick={() => onDownload(job)}>Download</Button>}
          {done && onArchive && <Button variant="link" onClick={() => onArchive(job)}>Archive</Button>}
          {onRestore && <Button variant="link" onClick={() => onRestore(job)}>Restore</Button>}
          {onDelete && <Button variant="link-danger" onClick={() => onDelete(job)}>Delete</Button>}
        </div>
      </div>
      <p className={`font-sans text-body ${failed ? 'text-danger-text' : 'text-ink-2'}`}>{detailFor(job, jobsAhead)}</p>
      {job.status === 'processing' && <ProgressBar value={job.progress} label={`${name} progress`} />}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge status={job.status} suffix={job.status === 'processing' ? `${Math.round(job.progress)}%` : undefined} />
        <span className="font-display text-caption font-light text-ink-3">{metaFor(job, now)}</span>
      </div>
    </article>
  );
};
