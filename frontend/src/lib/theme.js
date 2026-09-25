// Theme preference: 'system' (follow the OS) | 'light' | 'dark'.
// Stored per browser; index.css reads data-theme on <html>.
const KEY = 'transcribe.theme';

export const readTheme = () => {
  try {
    return localStorage.getItem(KEY) || 'system';
  } catch {
    return 'system';
  }
};

export const applyTheme = (theme) => {
  const root = document.documentElement;
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else delete root.dataset.theme;
};

export const saveTheme = (theme) => {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode / blocked storage: the choice just won't persist.
  }
  applyTheme(theme);
};
