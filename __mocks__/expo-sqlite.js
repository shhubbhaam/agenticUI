// Manual Jest mock — expo-sqlite is a native module with no JS fallback
// under Jest's node environment. This stand-in delegates every call to
// Node's built-in `node:sqlite` (DatabaseSync), so tests run against a real
// SQLite engine (real constraints, real ON CONFLICT handling) instead of a
// hand-rolled fake that only pretends to understand SQL.
const { DatabaseSync } = require('node:sqlite');

// Keyed by databaseName so repeated openDatabaseAsync() calls for the same
// name share one in-memory database within a test file, the way the real
// module shares one file-backed database on disk.
const openDatabases = new Map();

function wrap(nativeDb) {
  return {
    async execAsync(source) {
      nativeDb.exec(source);
    },
    async runAsync(source, ...params) {
      const bindParams = normalizeParams(params);
      const info = nativeDb.prepare(source).run(...bindParams);
      return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
    },
    async getFirstAsync(source, ...params) {
      const bindParams = normalizeParams(params);
      return nativeDb.prepare(source).get(...bindParams) ?? null;
    },
    async getAllAsync(source, ...params) {
      const bindParams = normalizeParams(params);
      return nativeDb.prepare(source).all(...bindParams);
    },
    async closeAsync() {
      nativeDb.close();
    },
  };
}

// expo-sqlite accepts either `runAsync(sql, [a, b])` or `runAsync(sql, a, b)`.
function normalizeParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }
  return params;
}

async function openDatabaseAsync(databaseName) {
  if (!openDatabases.has(databaseName)) {
    openDatabases.set(databaseName, wrap(new DatabaseSync(':memory:')));
  }
  return openDatabases.get(databaseName);
}

module.exports = { openDatabaseAsync };
