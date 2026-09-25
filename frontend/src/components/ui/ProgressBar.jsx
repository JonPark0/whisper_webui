// Figma "Progress Bar": 6px track, Tone = Accent | Success | Danger.
const TONES = { accent: 'bg-accent', success: 'bg-success-solid', danger: 'bg-danger-solid' };

export const ProgressBar = ({ value, tone = 'accent', showValue = false, label, thin = false }) => {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={`flex-1 overflow-hidden rounded-full bg-subtle ${thin ? 'h-[3px]' : 'h-1.5'}`}
      >
        <div className={`h-full rounded-full transition-[width] duration-500 ${TONES[tone]}`} style={{ width: `${pct}%` }} />
      </div>
      {showValue && <span className="font-mono text-mono text-ink-2 w-9 text-right">{pct}%</span>}
    </div>
  );
};
