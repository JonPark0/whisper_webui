import { NavLink } from 'react-router-dom';
import { engineLabel, useEngineInfo } from '../../hooks/useEngineInfo';

const NAV = [
  { to: '/', label: 'Transcribe', end: true },
  { to: '/enhance', label: 'Enhance' },
  { to: '/archive', label: 'Archive' },
];

// Figma "Top bar": wordmark + engine caption, text navigation (active = underline).
export const TopBar = () => {
  const info = useEngineInfo();
  return (
    <header className="px-6 lg:px-40 py-7 flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <div className="flex items-baseline gap-3 min-w-0">
        <NavLink to="/" className="font-wordmark text-wordmark text-ink">Transcribe</NavLink>
        {info?.engine && (
          <span className="font-display text-caption font-light text-ink-3 truncate">
            {engineLabel(info)}
          </span>
        )}
      </div>
      <nav aria-label="Main" className="ml-auto flex gap-7 font-display text-label">
        {NAV.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'text-ink underline underline-offset-4' : 'text-ink-2 hover:text-ink'
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
};
