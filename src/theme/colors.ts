export const colors = {
  // Brand & Navigation
  primary: '#0284c7', // Sky 600
  text: {
    dark: '#0f172a',  // Slate 900
    muted: '#64748b', // Slate 500
    light: '#ffffff',
  },
  border: '#f1f5f9',  // Slate 100
  background: {
    surface: '#ffffff',
    subtle: '#f8fafc',
  },

  // Learning Map / Path Nodes
  node: {
    completed: {
      base: '#0ea5e9',
      rim: '#0c4a6e',
      shadow: '#0c4a6e',
      icon: '#ffffff',
    },
    active: {
      base: '#00f003',
      rim: '#075985',
      shadow: '#0c4a6e',
      icon: '#ffffff',
    },
    locked: {
      base: '#f1f5f9',
      rim: '#cbd5e1',
      shadow: '#94a3b8',
      icon: '#94a3b8',
    },
  },

  // Stats
  stats: {
    book: '#0284c7',
    flame: '#f97316',
    gem: '#0284c7',
  },
} as const;

export type Colors = typeof colors;