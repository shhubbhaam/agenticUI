module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // Nested git worktrees (.worktrees/<branch>/) are full repo checkouts with
  // their own tests and node_modules — without this, running jest from the
  // main checkout root double-runs (and can cross-contaminate) every test
  // that also exists inside an active worktree. Anchored to <rootDir> (not
  // a bare "/.worktrees/") so this only excludes a worktree NESTED inside
  // the current project.
  // The BFF is a separate Node server with its own runner (node:test): `npm run test:bff`.
  // Jest-expo swaps in Expo's fetch polyfill, which breaks real HTTP calls in those tests.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.worktrees/', '<rootDir>/bff/'],
};
