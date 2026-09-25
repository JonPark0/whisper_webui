import { Icon } from './Icon';

// Figma "Alert": Tone = Info | Success | Warning | Danger.
const TONES = {
  info: { box: 'bg-info-bg text-info-text', icon: 'info', role: 'status' },
  success: { box: 'bg-success-bg text-success-text', icon: 'check', role: 'status' },
  warning: { box: 'bg-warning-bg text-warning-text', icon: 'alert', role: 'alert' },
  danger: { box: 'bg-danger-bg text-danger-text', icon: 'alert', role: 'alert' },
};

export const Alert = ({ tone = 'info', title, children, onDismiss }) => {
  const t = TONES[tone];
  return (
    <div role={t.role} className={`flex gap-3 rounded-lg p-3 ${t.box}`}>
      <Icon name={t.icon} size={20} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-sans text-body font-medium">{title}</p>}
        {children && <div className="font-sans text-body">{children}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 self-start rounded p-0.5 opacity-80 hover:opacity-100">
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
};
