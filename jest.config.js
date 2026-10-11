module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^lucide-react-native$': '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  // The BFF is a separate Node server with its own runner (node:test): `npm run test:bff`.
  // Jest-expo swaps in Expo's fetch polyfill, which breaks real HTTP calls in those tests.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/bff/'],
};
