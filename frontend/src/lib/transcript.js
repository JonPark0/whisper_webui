// Parsing and export of the transcript Markdown the backend writes:
//   # Transcript: name / **Source:** … / ## Content / [HH:MM:SS - HH:MM:SS] text

const SEGMENT = /^\[(\d{2}):(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2}):(\d{2})\]\s*(.*)$/;

const toSeconds = (h, m, s) => Number(h) * 3600 + Number(m) * 60 + Number(s);

export const parseSegments = (content) => {
  const segments = [];
  for (const line of content.split('\n')) {
    const m = line.match(SEGMENT);
    if (m) {
      segments.push({
        id: segments.length,
        start: toSeconds(m[1], m[2], m[3]),
        end: toSeconds(m[4], m[5], m[6]),
        text: m[7].trim(),
      });
    }
  }
  return segments;
};

// Body of the file below "## Content" (the header is metadata).
export const contentBody = (content) => {
  const idx = content.indexOf('## Content');
  return idx === -1 ? content : content.slice(idx + '## Content'.length).trim();
};

const srtTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},000`;
};

export const toSrt = (segments) =>
  segments
    .map((seg, i) => `${i + 1}\n${srtTime(seg.start)} --> ${srtTime(Math.max(seg.end, seg.start + 1))}\n${seg.text}\n`)
    .join('\n');

export const toPlainText = (content, segments) =>
  segments.length ? segments.map((s) => s.text).join('\n') : contentBody(content);
