// Manual Jest mock — react-native-mmkv is a native (Nitro) module with no
// JS fallback, so it can't run under Jest's node/jsdom test environment.
// This in-memory stand-in implements just enough of createMMKV()'s surface
// (get/set/remove for strings) for anything that only needs MMKV as a
// synchronous key-value store (e.g. useSessionStore's zustand/persist
// storage adapter).
function createMMKV() {
  const store = new Map();
  return {
    getString(key) {
      return store.has(key) ? store.get(key) : undefined;
    },
    set(key, value) {
      store.set(key, String(value));
    },
    remove(key) {
      const existed = store.has(key);
      store.delete(key);
      return existed;
    },
  };
}

module.exports = { createMMKV };
