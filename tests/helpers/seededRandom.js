// 固定種子的亂數（mulberry32）。遊戲到處直接呼叫 Math.random()，
// 所以測試只能整個覆寫它；用完一定要還原，避免影響其他測試。
export function createMulberry32(seed) {
  let stateValue = seed >>> 0;
  return function nextRandomNumber() {
    stateValue = (stateValue + 0x6D2B79F5) >>> 0;
    let mixed = stateValue;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// 在 callback 執行期間用固定種子取代 Math.random，結束（含丟例外）後還原
export function withSeededRandom(seed, callback) {
  const originalRandom = Math.random;
  Math.random = createMulberry32(seed);
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}
