// Mirrors the web app's palette (stockkitty/frontend/tailwind.config.js
// `surface` scale plus the Tailwind grays/blues it layers on) so the two
// clients read as the same product. Dark-only, like the web app.
export const colors = {
  bg: '#0b0f17',          // surface-950
  panel: '#121826',       // surface-900
  panelRaised: '#1a2131', // surface-850
  border: '#232c3f',      // surface-800
  borderStrong: '#2f3a52',// surface-700
  text: '#f3f4f6',        // gray-100
  textMuted: '#9ca3af',   // gray-400
  textFaint: '#6b7280',   // gray-500
  accent: '#2563eb',      // blue-600
  accentSoft: '#3b82f6',  // blue-500
  positive: '#34d399',    // emerald-400
  negative: '#f87171',    // red-400
  warning: '#fbbf24',     // amber-400
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 16 } as const;
