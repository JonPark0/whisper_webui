// Figma "Toggle": 44×24 switch. role="switch" + aria-checked; the focus ring
// comes from the global :focus-visible style.
export const Toggle = ({ checked, onChange, disabled = false, label, id }) => (
  <button
    type="button"
    role="switch"
    id={id}
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
      checked ? 'bg-accent justify-end' : 'bg-control-off justify-start'
    }`}
  >
    <span className="h-5 w-5 rounded-full bg-on-accent shadow" aria-hidden="true" />
  </button>
);

// Label + help text + switch, as laid out in the Figma "Toggle row".
export const ToggleRow = ({ id, label, help, checked, onChange, disabled }) => (
  <div className="flex items-center gap-6">
    <div className="flex-1 min-w-0">
      <label htmlFor={id} className="block font-display text-label text-ink">{label}</label>
      {help && <p className="font-display text-caption font-light text-ink-2">{help}</p>}
    </div>
    <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} />
  </div>
);
