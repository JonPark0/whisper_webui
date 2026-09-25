// Formatting helpers shared by pages and components.

// The API stores naive UTC datetimes without a zone suffix.
export const parseUtc = (value) => {
  if (!value) return null;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
};

// Uploads are saved as "<name>_<8 hex>.<ext>" to avoid collisions; show the
// name the user uploaded.
export const displayName = (path) => {
  if (!path) return '';
  const base = path.split(/[\\/]/).pop();
  return base.replace(/_[0-9a-f]{8}(\.[^.]+)$/i, '$1');
};

export const stem = (name) => name.replace(/\.[^.]+$/, '');

// 5283 -> "1:28:03", 845 -> "14:05"
export const formatClock = (seconds) => {
  if (seconds == null || Number.isNaN(seconds)) return '—';
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};

// 104 -> "1 min 44 s", 9240 -> "2 h 34 min"
export const formatSpan = (seconds) => {
  if (seconds == null || Number.isNaN(seconds)) return '';
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return m ? `${h} h ${m} min` : `${h} h`;
  const rest = s % 60;
  return rest ? `${m} min ${rest} s` : `${m} min`;
};

export const formatBytes = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${Math.round(mb)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const relativeTime = (value, now = Date.now()) => {
  const date = parseUtc(value);
  if (!date) return '';
  const minutes = Math.floor((now - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString();
};

export const formatDate = (value) => {
  const date = parseUtc(value);
  return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
};

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export const errorText = (err, fallback) =>
  err?.response?.data?.detail || err?.message || fallback;

// Transcription jobs: the uploaded audio name. Clean-up jobs read a transcript
// saved as "<audio stem>_<8 hex>_<job id>.md" — show the audio name instead.
export const jobTitle = (job) => {
  if (job.job_type !== 'enhance') return displayName(job.input_file);
  const base = job.input_file.split(/[\\/]/).pop();
  const audioStem = base.replace(/(_enhanced)?\.md$/i, '').replace(/_\d+$/, '').replace(/_[0-9a-f]{8}$/i, '');
  return `${audioStem} — clean-up`;
};
