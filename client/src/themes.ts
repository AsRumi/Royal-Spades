import type { Theme } from '@shared';

// Runtime-only tokens that ride along with each theme (not part of the shared
// Theme contract): the darkest vignette tone and the gold sheen colors.
interface ThemeExtras {
  feltDeep: string;
  goldSoft: string;
  goldGlow: string;
}

export const THEMES: Theme[] = [
  {
    id: 'royal-sapphire',
    name: 'Royal Sapphire',
    felt: '#0d1b3d',
    feltGlow: '#1d3468',
    gold: '#d4af37',
    accent: '#8a63d2',
    textOn: '#f4ecd7',
    displayFont: 'Cinzel, Georgia, serif',
    uiFont: 'Inter, system-ui, sans-serif',
    defaultBackId: 'back-sapphire',
  },
  {
    id: 'emerald-baccarat',
    name: 'Emerald Baccarat',
    felt: '#0b3b24',
    feltGlow: '#175c39',
    gold: '#d4af37',
    accent: '#3f9e6e',
    textOn: '#f2ecda',
    displayFont: 'Cinzel, Georgia, serif',
    uiFont: 'Inter, system-ui, sans-serif',
    defaultBackId: 'back-emerald',
  },
  {
    id: 'crimson-regency',
    name: 'Crimson Regency',
    felt: '#4a101d',
    feltGlow: '#6e1b2e',
    gold: '#d9b34a',
    accent: '#c96f4a',
    textOn: '#f3e3c2',
    displayFont: 'Cinzel, Georgia, serif',
    uiFont: 'Inter, system-ui, sans-serif',
    defaultBackId: 'back-crimson',
  },
];

const EXTRAS: Record<string, ThemeExtras> = {
  'royal-sapphire': { feltDeep: '#060d21', goldSoft: '#f0dfa8', goldGlow: 'rgba(212,175,55,0.35)' },
  'emerald-baccarat': { feltDeep: '#041d11', goldSoft: '#f0dfa8', goldGlow: 'rgba(212,175,55,0.35)' },
  'crimson-regency': { feltDeep: '#26060e', goldSoft: '#f3e0a6', goldGlow: 'rgba(217,179,74,0.38)' },
};

export const DEFAULT_THEME_ID = 'royal-sapphire';

export function themeById(themeId: string): Theme {
  return THEMES.find((t) => t.id === themeId) ?? THEMES[0];
}

export function applyTheme(themeId: string): void {
  const theme = themeById(themeId);
  const extras = EXTRAS[theme.id] ?? EXTRAS[DEFAULT_THEME_ID];
  const root = document.documentElement.style;
  root.setProperty('--felt', theme.felt);
  root.setProperty('--felt-glow', theme.feltGlow);
  root.setProperty('--felt-deep', extras.feltDeep);
  root.setProperty('--gold', theme.gold);
  root.setProperty('--gold-soft', extras.goldSoft);
  root.setProperty('--gold-glow', extras.goldGlow);
  root.setProperty('--accent', theme.accent);
  root.setProperty('--text-on', theme.textOn);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.felt);
}
