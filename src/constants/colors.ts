/**
 * DotFuel brand color system.
 * Migrated from webapp CSS custom properties.
 */

export const DotFuelColors = {
  // Brand primary
  lime: '#C2F000',
  limeLight: 'rgba(194,240,0,0.12)',
  limeMuted: 'rgba(194,240,0,0.3)',

  // Accent palette
  blue: '#2B5CE6',
  blueLight: 'rgba(43,92,230,0.15)',
  green: '#00E87A',
  greenLight: 'rgba(0,232,122,0.12)',
  red: '#FF3B3B',
  redLight: 'rgba(255,59,59,0.12)',
  orange: '#FF8C00',
  orangeLight: 'rgba(255,140,0,0.12)',

  // Surfaces (dark mode)
  black: '#0A0A0A',
  card: '#161616',
  surface: '#222222',

  // Text
  white: '#FFFFFF',
  text: '#F0F0F0',
  muted: '#9E9E9E',

  // Water
  water: '#4FC3F7',
  waterLight: 'rgba(79,195,247,0.1)',

  // Strava
  strava: '#FC4C02',
  stravaLight: 'rgba(252,76,2,0.12)',

  // Transparent overlays
  overlay: 'rgba(0,0,0,0.75)',
  cardBorder: 'rgba(255,255,255,0.05)',
  surfaceBorder: 'rgba(255,255,255,0.08)',
} as const;

export type DotFuelColor = keyof typeof DotFuelColors;

/**
 * Fuel score color mapping — determines dot color based on score percentage.
 */
export function fuelScoreColor(pct: number): string {
  if (pct >= 90) return DotFuelColors.lime;
  if (pct >= 70) return DotFuelColors.green;
  if (pct >= 40) return DotFuelColors.blue;
  if (pct > 0) return DotFuelColors.red;
  return DotFuelColors.surface;
}

/**
 * Typography presets following the webapp's DM Sans + Inter stack.
 */
export const DotFuelFonts = {
  display: 'Inter',
  body: 'DM Sans',
  mono: 'monospace',
} as const;

/**
 * Spacing scale (4-point grid).
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

/**
 * Border radius presets.
 */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;
