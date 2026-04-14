import { create } from 'zustand';

const THEME_KEY = 'salam_air_theme';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const savedTheme = localStorage.getItem(THEME_KEY);
const initialDark = savedTheme === 'dark';
applyTheme(initialDark);

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: initialDark,
  toggle: () =>
    set((state) => {
      const next = !state.isDark;
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      applyTheme(next);
      return { isDark: next };
    }),
}));
