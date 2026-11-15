// 以固定種子錄製預設玩法，供版本間逐世比對。
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const baselinePath = fileURLToPath(new URL("../baseline/基準_v7.json", import.meta.url));
const checkMode = process.argv.includes("--check");
const MAX_TURNS = 3000;
const FIRST_SEED = 1;
const LAST_SEED = 200;
const STRATEGY = "預設";
let randomSeed = 0;
let memoryStore = new Map();

// 必須先接管亂數與儲存空間，再載入任何遊戲模組。
function seededRandom() {
  randomSeed = (randomSeed + 0x6D2B79F5) | 0;
  let mixedValue = Math.imul(randomSeed ^ (randomSeed >>> 15), 1 | randomSeed);
  mixedValue = (mixedValue + Math.imul(mixedValue ^ (mixedValue >>> 7), 61 | mixedValue)) ^ mixedValue;
  return ((mixedValue ^ (mixedValue >>> 14)) >>> 0) / 4294967296;
}
Math.random = seededRandom;
globalThis.localStorage = {
  getItem: key => memoryStore.has(key) ? memoryStore.get(key) : null,
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: key => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

const { createGame } = await import("../src/game/controller.js");
const { state } = await import("../src/systems/state.js");
const { marks } = await import("../src/data/marks.js");
const { breakthrough } = await import("../src/systems/breakthrough.js");

function recordLife(seed) {
  randomSeed = seed;
  memoryStore = new Map();
  const game = createGame(() => {});
  const sequence = [];
  const eventIds = [];
  let breakthroughTotal = 0;
  let breakthroughSuccesses = 0;

  // 由 controller 呼叫點收集事件，包含重複事件與凡人期事件。
  for (const methodName of ["newLife", "chooseAim", "startMortal", "mortalAct", "mortalPick", "takeTest", "chooseAwakening", "pick", "deviate", "doAction", "doBreakthrough", "retire"]) {
    const originalMethod = game[methodName];
    game[methodName] = (...parameters) => {
      const eventId = methodName === "mortalPick" ? game.s?.mortal?.pending
        : methodName === "pick" && game.s?.current?.type === "event" ? game.s.current.id : null;
      if (eventId) {
        eventIds.push(eventId);
        sequence.push(["event", eventId]);
      }
      sequence.push([methodName, ...parameters]);
      const previousRealmIndex = game.s?.realmIndex;
      const previousFailures = game.s?.stats?.breakFails || 0;
      const result = originalMethod(...parameters);
      if (methodName === "doBreakthrough") {
        const succeeded = game.s.realmIndex > previousRealmIndex;
        const failed = game.s.stats.breakFails > previousFailures;
        if (succeeded || failed) {
          breakthroughTotal++;
          if (succeeded) breakthroughSuccesses++;
        }
      }
      return result;
    };
  }

  game.newLife("測試" + seed);
  if (seed % 3 === 0) {
    game.chooseAim(marks.aims[seed % marks.aims.length].id);
  } else {
    game.startMortal();
    let mortalGuard = 0;
    while (!game.s.mortal.finished && mortalGuard++ < 50) {
      if (game.s.mortal.pending) game.mortalPick(0);
      else {
        const aimIndex = (seed + game.s.mortal.done) % 2 === 0 ? seed % 6 : (seed + 1) % 6;
        game.mortalAct(marks.aims[aimIndex].id);
      }
    }
  }
  game.takeTest();
  game.chooseAwakening(0);
  let turnGuard = 0;
  while (game.s && game.s.alive && turnGuard++ < MAX_TURNS) {
    const gameState = game.s;
    if (gameState.current) {
      if (gameState.current.type === "deviation") game.deviate("散功重修");
      else game.pick(0);
      continue;
    }
    if (state.inBottleneck(gameState)) {
      if (gameState.demon > 20) {
        game.doAction("閉關", true);
        continue;
      }
      const targetRate = gameState.realmIndex === 0 ? 0.6 : 0.5;
      if (breakthrough.rate(gameState).rate >= targetRate || gameState.insight > 1500) {
        game.ui.bt = { material: Object.keys(gameState.materials)[0] || "", env: "洞府" };
        sequence.push(["setBreakthroughOptions", game.ui.bt.material, game.ui.bt.env]);
        game.doBreakthrough();
      } else game.doAction("閉關", true);
      continue;
    }
    if (gameState.demoEnd) {
      game.retire();
      continue;
    }
    game.doAction(turnGuard % 5 === 0 ? "遊歷" : "吐納", true);
  }

  const finalState = game.s;
  const realm = state.realm(finalState);
  return {
    strategy: STRATEGY,
    seed,
    cause: finalState.alive ? "回合上限" : finalState.cause,
    deathAge: Math.floor(state.age(finalState)),
    realm: realm.id,
    subRealm: realm.stages[finalState.stageIndex],
    stageName: state.stageName(finalState),
    breakthroughs: {
      total: breakthroughTotal,
      successes: breakthroughSuccesses,
      failures: breakthroughTotal - breakthroughSuccesses
    },
    demon: finalState.demon,
    insight: finalState.insight,
    spiritStones: finalState.stones,
    eventIds,
    notePages: finalState.notes.length,
    sequenceHash: createHash("sha256").update(JSON.stringify(sequence)).digest("hex")
  };
}

function summarize(lives) {
  const counts = new Map();
  for (const life of lives) counts.set(life.cause, (counts.get(life.cause) || 0) + 1);
  const topCauses = [...counts].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "zh-Hant")).slice(0, 3);
  const foundationCount = lives.filter(life => life.realm === "築基" || life.realm === "金丹").length;
  const goldenCoreCount = lives.filter(life => life.realm === "金丹").length;
  console.log(`${STRATEGY}（${lives.length} 世）：到築基 ${(foundationCount / lives.length * 100).toFixed(1)}%，到金丹 ${(goldenCoreCount / lives.length * 100).toFixed(1)}%`);
  console.log(`前三大死因：${topCauses.map(([cause, count]) => `${cause} ${count}`).join("、")}`);
}

const actual = {
  version: "v7",
  parameters: { strategy: STRATEGY, firstSeed: FIRST_SEED, lastSeed: LAST_SEED, maxTurns: MAX_TURNS, random: "mulberry32" },
  lives: Array.from({ length: LAST_SEED - FIRST_SEED + 1 }, (_, seedIndex) => recordLife(FIRST_SEED + seedIndex))
};
summarize(actual.lives);

if (checkMode) {
  if (!existsSync(baselinePath)) {
    console.error(`基準檔不存在：${baselinePath}`);
    process.exitCode = 1;
  } else {
    const expected = JSON.parse(readFileSync(baselinePath, "utf8"));
    const differences = [];
    for (const fieldName of ["version", "parameters"]) {
      if (JSON.stringify(expected[fieldName]) !== JSON.stringify(actual[fieldName])) differences.push(`頂層 ${fieldName}`);
    }
    if (expected.lives?.length !== actual.lives.length) differences.push(`世數：已存 ${expected.lives?.length}，重跑 ${actual.lives.length}`);
    for (const actualLife of actual.lives) {
      const expectedLife = expected.lives?.find(life => life.seed === actualLife.seed && life.strategy === actualLife.strategy);
      const fieldNames = [...new Set([...Object.keys(expectedLife || {}), ...Object.keys(actualLife)])];
      const changedFields = fieldNames.filter(fieldName => JSON.stringify(expectedLife?.[fieldName]) !== JSON.stringify(actualLife[fieldName]));
      if (changedFields.length) differences.push(`seed ${actualLife.seed}：${changedFields.join("、")}`);
      if (differences.length >= 10) break;
    }
    if (differences.length) {
      console.error(`基準不一致（前 10 筆）：\n${differences.slice(0, 10).join("\n")}`);
      process.exitCode = 1;
    } else console.log("基準一致");
  }
} else {
  mkdirSync(fileURLToPath(new URL("../baseline/", import.meta.url)), { recursive: true });
  writeFileSync(baselinePath, JSON.stringify(actual, null, 2).replace(/\n/g, "\r\n") + "\r\n", "utf8");
  console.log(`已寫入 ${baselinePath}`);
}
