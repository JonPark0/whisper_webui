import { useState } from 'react';
import { engineLabel, useEngineInfo } from '../../hooks/useEngineInfo';
import { readTheme, saveTheme } from '../../lib/theme';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Figma "Footer": centred text links + engine line (PALNARIUM style), plus
// the theme switch.
export const Footer = () => {
  const info = useEngineInfo();
  const [theme, setTheme] = useState(readTheme);
  const choose = (value) => { setTheme(value); saveTheme(value); };

  const engineLine = ['Transcribe', engineLabel(info), info?.enhancer_configured ? 'Gemini clean-up' : null]
    .filter(Boolean).join(' · ');

  return (
    <footer className="pt-6 pb-12 flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-4 font-display text-label">
        <a href="https://github.com/JonPark0/whisper_webui" className="text-ink hover:underline underline-offset-4">GitHub</a>
        <span className="text-ink-3" aria-hidden="true">|</span>
        <a href={`${API_BASE_URL}/docs`} className="text-ink hover:underline underline-offset-4">API docs</a>
      </div>
      <p className="font-display text-caption font-light text-ink-3">{engineLine}</p>
      <div role="radiogroup" aria-label="Theme" className="flex gap-3 font-display text-caption font-light">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={theme === t.value}
            onClick={() => choose(t.value)}
            className={theme === t.value ? 'text-ink underline underline-offset-4' : 'text-ink-3 hover:text-ink'}
          >
            {t.label}
          </button>
        ))}
      </div>
    </footer>
  );
};
