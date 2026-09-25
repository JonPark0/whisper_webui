import { Icon } from './Icon';

// Figma "Status Badge": Status × Style (Pill | Text). The label always names
// the state, so colour is never the only cue.
const STATUS = {
  pending: { label: 'Queued', dot: 'bg-ink-3', text: 'text-ink-2', pill: 'bg-subtle text-ink-2', icon: null },
  processing: { label: 'Processing', dot: 'bg-info-solid', text: 'text-info-text', pill: 'bg-info-bg text-info-text', icon: null },
  completed: { label: 'Completed', dot: 'bg-success-solid', text: 'text-ink-2', pill: 'bg-success-bg text-success-text', icon: 'check' },
  failed: { label: 'Failed', dot: 'bg-danger-solid', text: 'text-danger-text', pill: 'bg-danger-bg text-danger-text', icon: 'alert' },
};

export const StatusBadge = ({ status, suffix, style = 'text' }) => {
  const s = STATUS[status] || STATUS.pending;
  const label = suffix ? `${s.label} · ${suffix}` : s.label;

  if (style === 'pill') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full pl-2 pr-3 py-0.5 font-display text-caption ${s.pill}`}>
        {s.icon && <Icon name={s.icon} size={14} />}
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-caption font-light ${s.text}`}>
      <span className={`h-[7px] w-[7px] rounded-full ${s.dot} ${status === 'processing' ? 'animate-pulse' : ''}`} aria-hidden="true" />
      {label}
    </span>
  );
};
