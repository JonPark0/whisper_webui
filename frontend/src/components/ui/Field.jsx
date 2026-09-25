import { useId } from 'react';
import { Icon } from './Icon';

// Figma "Input": Type = Text | Select | Underline, with visible label and
// helper/error text wired through aria-describedby.
const boxBase =
  'w-full h-10 rounded-md border bg-surface px-3 font-sans text-body text-ink placeholder:text-ink-3 ' +
  'disabled:bg-subtle disabled:opacity-60 disabled:cursor-not-allowed';

const Wrapper = ({ id, label, help, error, children }) => (
  <div className="flex flex-col gap-1 min-w-0">
    {label && <label htmlFor={id} className="font-display text-label text-ink">{label}</label>}
    {children}
    {(error || help) && (
      <p id={`${id}-help`} className={`font-display text-caption font-light ${error ? 'text-danger-text' : 'text-ink-3'}`}>
        {error || help}
      </p>
    )}
  </div>
);

const describedBy = (id, help, error) => (help || error ? `${id}-help` : undefined);
const borderFor = (error) => (error ? 'border-danger-solid' : 'border-line-strong');

export const TextField = ({ label, help, error, className = '', ...props }) => {
  const id = useId();
  return (
    <Wrapper id={id} label={label} help={help} error={error}>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy(id, help, error)} className={`${boxBase} ${borderFor(error)} ${className}`} {...props} />
    </Wrapper>
  );
};

export const TextArea = ({ label, help, error, className = '', ...props }) => {
  const id = useId();
  return (
    <Wrapper id={id} label={label} help={help} error={error}>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, help, error)}
        className={`${boxBase} ${borderFor(error)} h-auto py-2 resize-y ${className}`}
        {...props}
      />
    </Wrapper>
  );
};

export const SelectField = ({ label, help, error, options, className = '', ...props }) => {
  const id = useId();
  return (
    <Wrapper id={id} label={label} help={help} error={error}>
      <div className="relative">
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={describedBy(id, help, error)}
          className={`${boxBase} ${borderFor(error)} appearance-none pr-9 ${className}`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
      </div>
    </Wrapper>
  );
};

// Type=Underline: bottom border only (PALNARIUM search field).
export const SearchField = ({ value, onChange, placeholder = 'Search …', label = 'Search', className = '' }) => (
  <div className={`flex items-center gap-2 h-10 border-b border-ink ${className}`}>
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="flex-1 min-w-0 bg-transparent font-sans text-body text-ink placeholder:text-ink-3 focus:outline-none"
    />
    <Icon name="search" size={20} className="text-ink-2" />
  </div>
);
