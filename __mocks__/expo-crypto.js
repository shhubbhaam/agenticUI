// Manual Jest mock — expo-crypto's digest/random functions are native, with
// no JS fallback under Jest's node environment. This stand-in delegates to
// Node's built-in `crypto` module so tests exercise a real hash/random
// implementation rather than a fake one.
const nodeCrypto = require('crypto');

const CryptoDigestAlgorithm = {
  SHA1: 'SHA-1',
  SHA256: 'SHA-256',
  SHA384: 'SHA-384',
  SHA512: 'SHA-512',
  MD2: 'MD2',
  MD4: 'MD4',
  MD5: 'MD5',
};

const CryptoEncoding = {
  HEX: 'hex',
  BASE64: 'base64',
};

const NODE_ALGORITHM_BY_EXPO_ALGORITHM = {
  'SHA-1': 'sha1',
  'SHA-256': 'sha256',
  'SHA-384': 'sha384',
  'SHA-512': 'sha512',
  MD5: 'md5',
};

function getRandomBytes(byteCount) {
  return new Uint8Array(nodeCrypto.randomBytes(byteCount));
}

async function getRandomBytesAsync(byteCount) {
  return getRandomBytes(byteCount);
}

async function digestStringAsync(algorithm, data, options) {
  const nodeAlgorithm = NODE_ALGORITHM_BY_EXPO_ALGORITHM[algorithm];
  if (!nodeAlgorithm) {
    throw new Error(`expo-crypto mock: unsupported algorithm ${algorithm}`);
  }
  const encoding = options?.encoding ?? CryptoEncoding.HEX;
  return nodeCrypto.createHash(nodeAlgorithm).update(data, 'utf8').digest(encoding);
}

function randomUUID() {
  return nodeCrypto.randomUUID();
}

module.exports = {
  randomUUID,
  CryptoDigestAlgorithm,
  CryptoEncoding,
  getRandomBytes,
  getRandomBytesAsync,
  digestStringAsync,
};
