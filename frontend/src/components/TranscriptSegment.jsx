import { forwardRef } from 'react';
import { formatClock } from '../lib/format';

const highlight = (text, query) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 ? <mark key={i} className="bg-warning-bg text-ink rounded-sm">{part}</mark> : part
  );
};

// Figma "Transcript Segment": Default | Active. A button, so Enter/Space seeks.
export const TranscriptSegment = forwardRef(function TranscriptSegment({ segment, active, query, onSeek }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSeek(segment.start)}
      aria-current={active || undefined}
      className={`w-full text-left flex gap-4 rounded-md px-4 py-3 border-l-[3px] transition-colors ${
        active ? 'bg-accent-subtle border-accent' : 'border-transparent hover:bg-canvas'
      }`}
    >
      <span className={`font-mono text-mono pt-1 shrink-0 ${active ? 'font-medium text-accent-text' : 'text-ink-3'}`}>
        {formatClock(segment.start)}
      </span>
      <span className="flex-1 font-sans text-body text-ink">{highlight(segment.text, query)}</span>
    </button>
  );
});
