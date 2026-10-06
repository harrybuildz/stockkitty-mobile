import { create } from 'zustand';

import {
  DEFAULT_HIDDEN_CATS,
  FILTERS_BY_KEY,
  type FilterKey,
  type FilterState,
  type FlagCategory,
  type Preset,
} from '@/lib/screener-filters';

type ScreenerFiltersStore = FilterState & {
  toggleFilter: (key: FilterKey) => void;
  setThreshold: (key: FilterKey, value: number) => void;
  toggleHiddenCat: (cat: FlagCategory) => void;
  setWatchlistOnly: (on: boolean) => void;
  applyPreset: (preset: Preset) => void;
  reset: () => void;
};

// Session-scoped on purpose (no persistence): the web resets filters per
// visit too, and a filter you forgot you set yesterday reads as data loss.
export const useScreenerFilters = create<ScreenerFiltersStore>((set) => ({
  active: {},
  hiddenCats: [...DEFAULT_HIDDEN_CATS],
  watchlistOnly: false,

  toggleFilter: (key) =>
    set((s) => {
      const active = { ...s.active };
      if (key in active) {
        delete active[key];
      } else {
        const threshold = FILTERS_BY_KEY[key].threshold;
        active[key] = threshold ? threshold.default : true;
      }
      return { active };
    }),

  setThreshold: (key, value) =>
    set((s) => (key in s.active ? { active: { ...s.active, [key]: value } } : s)),

  toggleHiddenCat: (cat) =>
    set((s) => ({
      hiddenCats: s.hiddenCats.includes(cat)
        ? s.hiddenCats.filter((c) => c !== cat)
        : [...s.hiddenCats, cat],
    })),

  setWatchlistOnly: (on) => set({ watchlistOnly: on }),

  // Presets replace the active set wholesale (same as the web) — they're
  // starting points, not additive layers.
  applyPreset: (preset) => set({ active: { ...preset.filters } }),

  reset: () =>
    set({ active: {}, hiddenCats: [...DEFAULT_HIDDEN_CATS], watchlistOnly: false }),
}));
