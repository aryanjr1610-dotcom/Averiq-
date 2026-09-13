// @refresh reset
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import type {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
} from 'react';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { resolveAcademicTheme } from '@/app/config/academic-themes';

import type {
  AcademicContext,
  ResolvedAcademicTheme,
  VisualPreferences,
} from '@/types/academic-theme';

const storageKey = 'averiq:visual-preferences:v1';

const defaults: VisualPreferences = {
  mode: 'dark',
  motion: 'system',
  contrast: 'system',
  decoration: 'standard',
  ambientMotion: true,
  pointerResponse: false,
  focusMode: false,
  uiStyle: 'living-sky',
  liveWeather: false,
  weatherTips: true,
};

function readPreferences(): VisualPreferences {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;

    const value: unknown = JSON.parse(raw);

    if (typeof value !== 'object' || value === null) {
      return defaults;
    }

    return {
      mode:
        'mode' in value &&
        ['dark', 'light', 'system'].includes(String(value.mode))
          ? value.mode as VisualPreferences['mode']
          : defaults.mode,

      motion:
        'motion' in value && value.motion === 'reduce'
          ? 'reduce'
          : 'system',

      contrast:
        'contrast' in value && value.contrast === 'high'
          ? 'high'
          : 'system',

      decoration:
        'decoration' in value &&
        ['standard', 'minimal', 'off'].includes(String(value.decoration))
          ? value.decoration as VisualPreferences['decoration']
          : defaults.decoration,

      ambientMotion:
        'ambientMotion' in value
          ? value.ambientMotion === true
          : defaults.ambientMotion,

      pointerResponse:
        'pointerResponse' in value && value.pointerResponse === true,

      // Focus mode is temporary, not persisted across sessions.
      focusMode: false,
      largerText: 'largerText' in value && value.largerText === true,
      uiStyle:
        'uiStyle' in value && value.uiStyle === 'academic'
          ? 'academic'
          : 'living-sky',
      liveWeather:
        'liveWeather' in value && value.liveWeather === true,
      weatherTips:
        !('weatherTips' in value) || value.weatherTips !== false,
    };
  } catch {
    return defaults;
  }
}

type AcademicThemeValue = {
  context: AcademicContext;
  setContext: Dispatch<SetStateAction<AcademicContext>>;
  preferences: VisualPreferences;
  updatePreferences: (patch: Partial<VisualPreferences>) => void;
  theme: ResolvedAcademicTheme;
  reducedMotion: boolean;
  resolvedMode: 'dark' | 'light';
};

const AcademicThemeContext =
  createContext<AcademicThemeValue | null>(null);

export function AcademicThemeProvider({
  children,
}: PropsWithChildren) {
  const [context, setContext] = useState<AcademicContext>({
    grade: 10,
    group: 'balanced',
    page: 'default',
  });

  const [preferences, setPreferences] =
    useState<VisualPreferences>(readPreferences);

  const systemDark = useMediaQuery('(prefers-color-scheme: dark)');
  const systemReduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const systemContrast = useMediaQuery('(prefers-contrast: more)');

  const resolvedMode = preferences.mode === 'system'
    ? systemDark ? 'dark' : 'light'
    : preferences.mode;

  const reducedMotion =
    systemReduced ||
    preferences.motion === 'reduce';

  const theme = useMemo(
    () => resolveAcademicTheme(context),
    [context],
  );

  const updatePreferences = useCallback(
    (patch: Partial<VisualPreferences>) => {
      setPreferences((current) => ({
        ...current,
        ...patch,
      }));
    },
    [],
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...JSON.parse(localStorage.getItem(storageKey) ?? '{}'),
          ...preferences,
          focusMode: false,
        }),
      );
    } catch {
      // Storage may be unavailable or full.
      // Preferences still work for the current session.
    }
  }, [preferences]);

  useLayoutEffect(() => {
    const root = document.documentElement;

    root.dataset.theme = resolvedMode;
    const themeColor = getComputedStyle(root).getPropertyValue('--canvas').trim() || (resolvedMode === 'dark' ? 'black' : 'white');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    root.dataset.motion = reducedMotion ? 'reduce' : 'standard';
    root.dataset.decoration = preferences.decoration;
    root.dataset.textScale = preferences.largerText ? 'large' : 'normal';
    root.dataset.uiStyle = preferences.uiStyle;
    root.dataset.liveWeather = preferences.liveWeather ? 'true' : 'false';
    root.dataset.weatherTips = preferences.weatherTips ? 'true' : 'false';
    root.dataset.contrast =
      systemContrast || preferences.contrast === 'high'
        ? 'high'
        : 'standard';

    root.dataset.focusMode = String(
      preferences.focusMode || theme.page === 'focus',
    );

    root.dataset.academicPage = theme.page;

    root.style.setProperty(
      '--academic-a',
      `var(--tone-${theme.accent})`,
    );

    root.style.setProperty(
      '--academic-b',
      `var(--tone-${theme.secondary})`,
    );
  }, [
    resolvedMode,
    reducedMotion,
    systemContrast,
    preferences.contrast,
    preferences.decoration,
    preferences.largerText,
    preferences.focusMode,
    preferences.uiStyle,
    preferences.liveWeather,
    preferences.weatherTips,
    theme,
  ]);

  const value = useMemo(
    () => ({
      context,
      setContext,
      preferences,
      updatePreferences,
      theme,
      reducedMotion,
      resolvedMode,
    }),
    [
      context,
      preferences,
      updatePreferences,
      theme,
      reducedMotion,
      resolvedMode,
    ],
  );

  return (
    <AcademicThemeContext.Provider value={value}>
      {children}
    </AcademicThemeContext.Provider>
  );
}

export function useAcademicTheme(): AcademicThemeValue {
  const context = useContext(AcademicThemeContext);

  if (!context) {
    throw new Error(
      'useAcademicTheme must be used within AcademicThemeProvider.',
    );
  }

  return context;
}
