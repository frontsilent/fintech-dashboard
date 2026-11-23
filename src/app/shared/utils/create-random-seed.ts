const seedWords = 2;
const bytesPerWord = Uint32Array.BYTES_PER_ELEMENT;

/** Creates a cryptographically random unsigned 64-bit seed (e.g. for a deterministic PRNG). */
export function createRandomSeed(): bigint {
  const words = crypto.getRandomValues(new Uint32Array(seedWords));
  const view = new DataView(new ArrayBuffer(seedWords * bytesPerWord));

  for (const [index, word] of words.entries()) {
    view.setUint32(index * bytesPerWord, word);
  }

  return view.getBigUint64(0);
}
