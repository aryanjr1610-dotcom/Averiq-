'use client';
import * as React from 'react';

type Theme = 'dark' | 'light' | 'system';
const Ctx = React.createContext<{ theme: Theme; setTheme: (t: Theme) => void; lowPower: boolean; setLowPower: (v: boolean) => void }>({
  theme: 'dark', setTheme: () => {}, lowPower: false, setLowPower: () => {},
});
export const useTheme = () => React.useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>('dark');
  const [lowPower, setLowPowerState] = React.useState(false);

  React.useEffect(() => {
    const t = (localStorage.getItem('averiq:theme') as Theme) || 'dark';
    const lp = localStorage.getItem('averiq:low-power') === 'true';
    setThemeState(t);
    setLowPowerState(lp);
  }, []);

  React.useEffect(() => {
    const resolve = (t: Theme): 'dark' | 'light' =>
      t === 'system' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;

    const apply = () => document.documentElement.setAttribute('data-theme', resolve(theme));
    apply();

    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  React.useEffect(() => {
    document.documentElement.toggleAttribute('data-low-power', lowPower);
  }, [lowPower]);

  const setTheme = (t: Theme) => { setThemeState(t); localStorage.setItem('averiq:theme', t); };
  const setLowPower = (v: boolean) => { setLowPowerState(v); localStorage.setItem('averiq:low-power', String(v)); };

  return <Ctx.Provider value={{ theme, setTheme, lowPower, setLowPower }}>{children}</Ctx.Provider>;
}
