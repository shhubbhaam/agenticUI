module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Nested git worktrees (.worktrees/<branch>/) are full repo checkouts with
  // their own tests and node_modules — without this, running jest from the
  // main checkout root double-runs (and can cross-contaminate) every test
  // that also exists inside an active worktree.
  testPathIgnorePatterns: ['/node_modules/', '/.worktrees/'],
};
