import { useCallback, useEffect, useRef, useState } from 'react';
import { apiService } from '../services/api';
import { useEngineInfo } from '../hooks/useEngineInfo';
import { useDebounced, useJobs, useNow } from '../hooks/useJobs';
import { errorText, formatClock, jobTitle, relativeTime } from '../lib/format';
import { PageSplit, Section } from '../components/layout/PageSplit';
import { JobList } from '../components/JobList';
import { TRANSLATION_OPTIONS } from '../components/TranscribeOptions';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { SearchField, SelectField, TextArea } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';

const PAGE_SIZE = 8;

// Not in Figma v2: composed from the same primitives as the Transcribe screen.
export const EnhancePage = () => {
  const engineInfo = useEngineInfo();
  const now = useNow();
  const [selected, setSelected] = useState([]);
  const [translateTo, setTranslateTo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const refetchQueue = useRef(null);
  const onRefetchReady = useCallback((fn) => { refetchQueue.current = fn; }, []);
  const q = useDebounced(search.trim());
  useEffect(() => { setPage(1); }, [q]);

  const { jobs, total, pageCount, loading } = useJobs(
    { job_type: 'transcribe', status: 'completed', archived: 0, ...(q ? { q } : {}) },
    { page, pageSize: PAGE_SIZE, interval: 10000 }
  );
  const enhancerUnavailable = engineInfo && engineInfo.enhancer_configured === false;

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    setSubmitting(true);
    const failed = [];
    for (const id of selected) {
      try {
        await apiService.createEnhanceJob(id, {
          translate_to: translateTo || null,
          enhancement_prompt: prompt.trim() || null,
        });
        setSelected((prev) => prev.filter((x) => x !== id));
      } catch (err) {
        failed.push(`#${id}: ${errorText(err, 'could not be queued')}`);
      }
    }
    setErrors(failed);
    setSubmitting(false);
    refetchQueue.current?.();
  };

  return (
    <PageSplit
      title="Enhance"
      description="Clean up finished transcripts with Gemini: punctuation, filler words, structure — and optionally translate them."
      aside={<span>{total} transcript{total === 1 ? '' : 's'} available</span>}
    >
      {enhancerUnavailable && (
        <Alert tone="warning" title="Gemini is not configured">
          Set GEMINI_API_KEY on the server to enable clean-up and translation.
        </Alert>
      )}

      <Section
        title="Choose transcripts"
        actions={<SearchField value={search} onChange={setSearch} className="w-full max-w-[260px]" label="Search transcripts" />}
      >
        <fieldset aria-busy={loading || undefined}>
          <legend className="sr-only">Transcripts to clean up</legend>
          {jobs.map((job) => (
            <label key={job.id} className="border-t border-line py-3 flex items-center gap-4 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(job.id)}
                onChange={() => toggle(job.id)}
                className="h-4 w-4 accent-[var(--color-accent-default)]"
              />
              <span className="flex-1 min-w-0 truncate font-sans text-body text-ink">{jobTitle(job)}</span>
              <span className="font-display text-caption font-light text-ink-3">
                {[job.audio_duration ? formatClock(job.audio_duration) : null, job.enable_timestamp ? 'Timestamps' : null,
                  job.auto_enhance ? 'already cleaned up' : null, `#${job.id}`, relativeTime(job.completed_at, now)]
                  .filter(Boolean).join(' · ')}
              </span>
            </label>
          ))}
          {!loading && jobs.length === 0 && (
            <p className="border-t border-line py-8 font-sans text-body text-ink-3">
              {q ? `No transcripts match “${q}”.` : 'No finished transcripts yet.'}
            </p>
          )}
          <div className="border-t border-line" />
        </fieldset>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </Section>

      <Section title="Options">
        <div className="grid gap-6 sm:grid-cols-2">
          <SelectField
            label="Translate to"
            help="Gemini translates the cleaned-up transcript."
            value={translateTo}
            onChange={(e) => setTranslateTo(e.target.value)}
            options={TRANSLATION_OPTIONS}
          />
        </div>
        <TextArea
          label="Extra instructions (optional)"
          help="Added to the default clean-up instructions."
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        {errors.length > 0 && (
          <Alert tone="danger" title="Some transcripts were not queued" onDismiss={() => setErrors([])}>
            <ul>{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <p className="flex-1 font-display text-caption font-light text-ink-3">
            {selected.length ? `${selected.length} selected` : 'Select transcripts above'}
          </p>
          <Button onClick={submit} disabled={!selected.length || enhancerUnavailable} loading={submitting}>
            {selected.length > 1 ? `Clean up ${selected.length} transcripts` : 'Clean up transcript'}
          </Button>
        </div>
      </Section>

      <JobList title="Queue" jobType="enhance" emptyText="No clean-up jobs yet." onRefetchReady={onRefetchReady} />
    </PageSplit>
  );
};
