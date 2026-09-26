import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiService } from '../services/api';
import { useEngineInfo } from '../hooks/useEngineInfo';
import {
  downloadBlob, errorText, formatClock, formatDate, formatSpan, jobTitle, parseUtc, stem,
} from '../lib/format';
import { contentBody, parseSegments, toPlainText, toSrt } from '../lib/transcript';
import { TranscriptSegment } from '../components/TranscriptSegment';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { SearchField } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';

const SPEEDS = [1, 1.25, 1.5, 2];
const MANUAL_SCROLL_PAUSE_MS = 4000;

// Figma "Transcript v2": its own route instead of a modal, so it can be
// bookmarked and shared.
export const TranscriptPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const engineInfo = useEngineInfo();
  const [job, setJob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [query, setQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const audioRef = useRef(null);
  const segmentRefs = useRef({});
  const lastManualScroll = useRef(0);

  // Load the job; keep polling until it finishes, then load the transcript.
  useEffect(() => {
    let cancelled = false;
    let timer;
    const load = async () => {
      try {
        const j = await apiService.getJob(jobId);
        if (cancelled) return;
        setJob(j);
        if (j.status === 'completed') {
          const r = await apiService.getJobResult(jobId);
          if (!cancelled) setResult(r);
        } else if (j.status !== 'failed') {
          timer = setTimeout(load, 3000);
        }
      } catch (err) {
        if (!cancelled) setError(errorText(err, 'Could not load this job'));
      }
    };
    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [jobId]);

  const segments = useMemo(() => (result ? parseSegments(result.content) : []), [result]);
  const matches = useMemo(
    () => (query ? segments.filter((s) => s.text.toLowerCase().includes(query.toLowerCase())) : []),
    [segments, query]
  );
  const activeId = segments.find((s) => time >= s.start && time < Math.max(s.end, s.start + 1))?.id;

  // Follow playback, unless the reader scrolled on their own recently.
  useEffect(() => {
    const onScroll = () => { lastManualScroll.current = Date.now(); };
    window.addEventListener('wheel', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('touchmove', onScroll);
    };
  }, []);
  useEffect(() => {
    if (activeId == null || !playing) return;
    if (Date.now() - lastManualScroll.current < MANUAL_SCROLL_PAUSE_MS) return;
    segmentRefs.current[activeId]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeId, playing]);

  useEffect(() => { setMatchIndex(0); }, [query]);
  const nextMatch = () => {
    if (!matches.length) return;
    const m = matches[matchIndex % matches.length];
    segmentRefs.current[m.id]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setMatchIndex((i) => i + 1);
  };

  const seek = (seconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setTime(seconds);
    audio.play().catch(() => {});
  };
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const title = job ? jobTitle(job) : '';
  const base = stem(title).replace(' — clean-up', '_clean-up');
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(result.content, segments));
      setNotice({ tone: 'success', text: 'Transcript copied to the clipboard.' });
    } catch {
      setNotice({ tone: 'danger', text: 'The browser blocked clipboard access.' });
    }
  };
  const downloadMd = async () => {
    try {
      downloadBlob(await apiService.downloadResult(jobId), `${base}.md`);
    } catch (err) {
      setNotice({ tone: 'danger', text: errorText(err, 'Download failed') });
    }
  };
  const downloadText = (text, ext, type) => downloadBlob(new Blob([text], { type }), `${base}.${ext}`);
  const cleanUp = async () => {
    try {
      await apiService.createEnhanceJob(Number(jobId), {});
      setNotice({ tone: 'success', text: 'Clean-up queued. Follow it on the Enhance page.', link: '/enhance' });
    } catch (err) {
      setNotice({ tone: 'danger', text: errorText(err, 'Could not queue the clean-up') });
    }
  };

  if (error) {
    return (
      <main className="px-6 lg:px-40 py-16 max-w-3xl">
        <Alert tone="danger" title="Transcript unavailable">{error}</Alert>
        <Button variant="link" className="mt-4" onClick={() => navigate(-1)}>← Back</Button>
      </main>
    );
  }
  if (!job) return <main className="px-6 lg:px-40 py-16 font-sans text-body text-ink-3">Loading…</main>;

  const started = parseUtc(job.started_at);
  const finished = parseUtc(job.completed_at);
  const backTo = job.job_type === 'enhance' ? '/enhance' : '/';
  const hasPlayer = job.job_type === 'transcribe' && segments.length > 0;
  const canCleanUp = job.job_type === 'transcribe' && engineInfo?.enhancer_configured;

  return (
    <main>
      <div className="px-6 lg:px-40 py-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        <Link to={backTo} className="font-display text-label text-ink-2 hover:text-ink">← Back to queue</Link>
        {result && (
          <div className="ml-auto flex flex-wrap items-center gap-x-5">
            <Button variant="link" onClick={copyText}>Copy text</Button>
            <Button variant="link" onClick={downloadMd}>Download .md</Button>
            {segments.length > 0 && <Button variant="link" onClick={() => downloadText(toSrt(segments), 'srt', 'application/x-subrip')}>.srt</Button>}
            <Button variant="link" onClick={() => downloadText(toPlainText(result.content, segments), 'txt', 'text/plain')}>.txt</Button>
            {canCleanUp && (
              <>
                <span className="font-display text-label text-ink-3" aria-hidden="true">|</span>
                <Button variant="link-strong" onClick={cleanUp}>Clean up with Gemini</Button>
              </>
            )}
          </div>
        )}
      </div>

      <header className="px-6 pt-14 pb-10 flex flex-col items-center gap-2.5 text-center">
        <h1 className="font-display text-[40px] leading-[48px] lg:text-display font-light text-ink break-all">{title}</h1>
        <p className="font-sans text-body text-ink-2">
          {[job.audio_duration ? `${formatClock(job.audio_duration)} of audio` : null,
            job.job_type === 'transcribe' ? engineInfo?.engine : 'Gemini clean-up',
            segments.length ? `${segments.length} segments` : null].filter(Boolean).join(' · ')}
        </p>
        <div className="flex items-center gap-3">
          <StatusBadge status={job.status} />
          {finished && (
            <span className="font-display text-caption font-light text-ink-3">
              {job.job_type === 'enhance' ? 'Cleaned up' : 'Transcribed'} on {formatDate(job.completed_at)}
              {started ? ` · in ${formatSpan((finished - started) / 1000)}` : ''}
            </span>
          )}
        </div>
      </header>

      {notice && (
        <div className="px-6 max-w-[760px] mx-auto mb-6">
          <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text} {notice.link && <Link to={notice.link} className="underline underline-offset-4">Open</Link>}
          </Alert>
        </div>
      )}

      {job.status === 'completed' && !result && (
        <p className="px-6 max-w-[760px] mx-auto pb-24 font-sans text-body text-ink-3" aria-live="polite">Loading the transcript…</p>
      )}

      {job.status !== 'completed' && (
        <div className="px-6 max-w-[760px] mx-auto pb-24 flex flex-col gap-3">
          {job.status === 'failed' ? (
            <Alert tone="danger" title="This job failed">{job.error_message}</Alert>
          ) : (
            <>
              <p className="font-sans text-body text-ink-2">{job.stage_message || 'Waiting in the queue'}</p>
              <ProgressBar value={job.progress} showValue label="Job progress" />
            </>
          )}
        </div>
      )}

      {hasPlayer && (
        <div className="sticky top-0 z-10 bg-surface border-y border-line">
          <div className="max-w-[760px] mx-auto px-6 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              className="h-10 w-10 shrink-0 rounded-full bg-accent text-on-accent flex items-center justify-center hover:bg-accent-hover"
            >
              <Icon name={playing ? 'pause' : 'play'} size={18} strokeWidth={3} />
            </button>
            <span className="font-mono text-mono text-ink">{formatClock(time)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(time, duration || 0)}
              onChange={(e) => seek(Number(e.target.value))}
              aria-label="Seek"
              className="flex-1 min-w-[120px] accent-[var(--color-accent-default)]"
            />
            <span className="font-mono text-mono text-ink-3">{formatClock(duration)}</span>
            <button type="button" onClick={cycleSpeed} className="font-display text-label text-ink-2 hover:text-ink" aria-label="Playback speed">
              {Number.isInteger(speed) ? speed.toFixed(1) : speed}×
            </button>
            <form
              onSubmit={(e) => { e.preventDefault(); nextMatch(); }}
              className="basis-full sm:basis-[200px] flex flex-col"
            >
              <SearchField value={query} onChange={setQuery} placeholder="Find in transcript" label="Find in transcript" />
              {query && <span className="font-display text-caption font-light text-ink-3 pt-1" aria-live="polite">{matches.length} matches · Enter for next</span>}
            </form>
            <audio
              ref={audioRef}
              src={result.audio_url}
              preload="metadata"
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
            />
          </div>
        </div>
      )}

      {result && (
        <div className="px-6 pt-8 pb-16">
          <div className="max-w-[760px] mx-auto">
            {segments.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {segments.map((seg) => (
                  <TranscriptSegment
                    key={seg.id}
                    ref={(el) => { segmentRefs.current[seg.id] = el; }}
                    segment={seg}
                    active={seg.id === activeId}
                    query={query}
                    onSeek={seek}
                  />
                ))}
              </div>
            ) : (
              <article className="prose max-w-none font-sans prose-headings:font-display prose-headings:font-light">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentBody(result.content)}</ReactMarkdown>
              </article>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
