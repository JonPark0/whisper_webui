import { useCallback, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { useEngineInfo } from '../hooks/useEngineInfo';
import { useStats } from '../hooks/useJobs';
import { displayName, errorText, formatBytes, formatClock, formatSpan } from '../lib/format';
import { PageSplit, Section } from '../components/layout/PageSplit';
import { JobList } from '../components/JobList';
import { TranscribeOptions, DEFAULT_TRANSCRIBE_OPTIONS } from '../components/TranscribeOptions';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { AUDIO_EXTENSIONS, Dropzone } from '../components/ui/Dropzone';

export const StatsAside = ({ stats }) =>
  stats ? (
    <>
      <span>{stats.running} running</span>
      <span>{stats.queued} queued</span>
      <span>
        {stats.done_today} done today
        {stats.audio_seconds_today > 0 && ` · ${formatSpan(stats.audio_seconds_today)} of audio`}
      </span>
    </>
  ) : null;

export const TranscribePage = () => {
  const engineInfo = useEngineInfo();
  const { stats, refetch: refetchStats } = useStats();
  const [ready, setReady] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [options, setOptions] = useState(DEFAULT_TRANSCRIBE_OPTIONS);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const refetchQueue = useRef(null);
  const onRefetchReady = useCallback((fn) => { refetchQueue.current = fn; }, []);

  const handleFiles = async (files) => {
    const valid = files.filter((f) => AUDIO_EXTENSIONS.includes(`.${f.name.split('.').pop().toLowerCase()}`));
    const rejected = files.filter((f) => !valid.includes(f));
    const newErrors = rejected.map((f) => `${f.name}: unsupported format`);
    setUploads(valid.map((f) => ({ name: f.name, progress: 0 })));

    for (const file of valid) {
      try {
        const result = await apiService.uploadAudio(file, (progress) =>
          setUploads((prev) => prev.map((u) => (u.name === file.name ? { ...u, progress } : u)))
        );
        setReady((prev) => (prev.some((r) => r.filename === result.filename) ? prev : [...prev, result]));
      } catch (err) {
        newErrors.push(`${file.name}: ${errorText(err, 'upload failed')}`);
      } finally {
        setUploads((prev) => prev.map((u) => (u.name === file.name ? { ...u, progress: 100 } : u)));
      }
    }
    setUploads([]);
    setErrors(newErrors);
  };

  const submitAll = async () => {
    setSubmitting(true);
    const failed = [];
    for (const file of ready) {
      try {
        await apiService.createTranscribeJob(file.filename, {
          ...options,
          translate_to: options.translate_to || null,
          enhancement_prompt: options.enhancement_prompt.trim() || null,
          start_time: null,
          end_time: null,
        });
        setReady((prev) => prev.filter((r) => r.filename !== file.filename));
      } catch (err) {
        failed.push(`${displayName(file.filename)}: ${errorText(err, 'could not be queued')}`);
      }
    }
    setErrors(failed);
    setSubmitting(false);
    refetchQueue.current?.();
    refetchStats();
  };

  const totalSeconds = ready.reduce((sum, r) => sum + (r.duration || 0), 0);

  return (
    <PageSplit
      title="Transcribe"
      description="Drop recordings, set options once, and queue them. Jobs keep running if you close this tab."
      aside={<StatsAside stats={stats} />}
    >
      <Section title="Add audio">
        <Dropzone onFiles={handleFiles} uploads={uploads} />
        {errors.length > 0 && (
          <Alert tone="danger" title={errors.length === 1 ? 'One file was not added' : `${errors.length} files were not added`} onDismiss={() => setErrors([])}>
            <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </Alert>
        )}
        {ready.length > 0 && (
          <ul aria-label="Ready to queue" className="border-b border-line">
            {ready.map((file) => (
              <li key={file.filename} className="border-t border-line py-3 flex items-center gap-4">
                <span className="flex-1 min-w-0 truncate font-sans text-body text-ink">{displayName(file.filename)}</span>
                <span className="font-display text-caption font-light text-ink-3">
                  {[file.duration != null ? formatClock(file.duration) : null, formatBytes(file.size)].filter(Boolean).join(' · ')}
                </span>
                <Button variant="link" onClick={() => setReady((prev) => prev.filter((r) => r.filename !== file.filename))}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Options">
        <TranscribeOptions value={options} onChange={setOptions} engineInfo={engineInfo} />
        <div className="flex flex-wrap items-center gap-4">
          <p className="flex-1 font-display text-caption font-light text-ink-3">
            {ready.length
              ? `${ready.length} file${ready.length === 1 ? '' : 's'}${totalSeconds ? ` · ${formatSpan(totalSeconds)}` : ''} · options apply to all`
              : 'Add audio files to queue them'}
          </p>
          <Button onClick={submitAll} disabled={!ready.length} loading={submitting}>
            {ready.length > 1 ? `Add ${ready.length} files to queue` : 'Add to queue'}
          </Button>
        </div>
      </Section>

      <JobList
        title="Queue"
        jobType="transcribe"
        emptyText="Nothing queued yet — added files show up here with live progress."
        onRefetchReady={onRefetchReady}
        runningCount={stats?.running ?? 0}
      />
    </PageSplit>
  );
};
