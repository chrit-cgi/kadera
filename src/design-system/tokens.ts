// Design tokens — sole source of truth for all visual values.
// Do NOT use inline style values for color, spacing, font, or radius in components.

export const tokens = {
  color: {
    brand: {
      primary: '#1A56DB',   // Cobalt blue — main action colour
      secondary: '#0E9F6E', // Teal — coaching highlights, phase markers
    },
    surface: {
      base: '#0F172A',      // Deep navy — page/card background
      raised: '#1E293B',    // Elevated card (modal, bottom sheet)
      overlay: 'rgba(15, 23, 42, 0.85)', // Semi-transparent overlay (Galaxy)
    },
    text: {
      primary: '#F1F5F9',   // Near-white — body text
      secondary: '#94A3B8', // Slate — supporting text, labels
      disabled: '#475569',  // Muted — placeholder, inactive
    },
    feedback: {
      success: '#0E9F6E',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    // Session type colours (for DayPill, plan grid)
    session: {
      easy: '#0E9F6E',
      threshold: '#F59E0B',
      vo2max: '#EF4444',
      long_run: '#3B82F6',
      recovery: '#6B7280',
      cross_training: '#8B5CF6',
      race: '#F97316',
    },
    // HR zone colours (for HRZoneBar)
    hrZone: {
      z1: '#22D3EE',
      z2: '#34D399',
      z3: '#FDE047',
      z4: '#FB923C',
      z5: '#F87171',
    },
  },

  font: {
    family: {
      heading: '"Inter", system-ui, -apple-system, sans-serif',
      body: '"Inter", system-ui, -apple-system, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
    },
    size: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      md: '1rem',      // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    weight: {
      regular: '400',
      medium: '500',
      bold: '700',
    },
  },

  line: {
    height: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },

  // 8px base grid: space.1 = 4px, space.2 = 8px, space.3 = 12px, ...
  space: {
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    7: '1.75rem',  // 28px
    8: '2rem',     // 32px
    9: '2.5rem',   // 40px
    10: '3rem',    // 48px
    11: '4rem',    // 64px
    12: '6rem',    // 96px
  },

  radius: {
    sm: '0.25rem',    // 4px — tags, chips
    md: '0.5rem',     // 8px — cards, inputs
    lg: '1rem',       // 16px — bottom sheets, modals
    full: '9999px',   // Pills, avatars
  },

  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.4)',
    md: '0 4px 6px rgba(0,0,0,0.4)',
    lg: '0 10px 15px rgba(0,0,0,0.4)',
  },

  // Tab bar + nav
  layout: {
    tabBarHeight: '64px',
    sidebarWidth: '256px',
    contentMaxWidth: '768px',
  },

  // Timing
  transition: {
    fast: '100ms ease',
    normal: '150ms ease',
    slow: '300ms ease',
  },
} as const

export type Tokens = typeof tokens
