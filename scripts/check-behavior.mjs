// 固定種子行為比對：npm run check:behavior
// 用途：重構（搬檔、拆函式、改名）不該改變遊戲行為。這支腳本用固定種子的偽亂數覆寫 Math.random，
//   跑整世模擬（simulate.js 與 balance.js 的玩法流程）與舊格式存檔載入，把每世摘要與狀態雜湊
//   輸出，和 scripts/fixtures/behavior-baseline.txt 逐行比對；不一致就印出第一處差異並以非 0 結束。
// 黃金檔取自重構前的程式（f648810），所以通過代表「重構前後輸出逐字相同」。
// 何時需要有意識地更新黃金檔：只有在「刻意改了遊戲規則、數值、事件資料或存檔格式」時。
//   純重構不該更新；若比對失敗，先當成回歸去查。確定是刻意改動後，執行
//   node scripts/check-behavior.mjs --update 重新產生黃金檔，並在 commit 訊息說明為何改動。
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const baselinePath = fileURLToPath(new URL("./fixtures/behavior-baseline.txt", import.meta.url));
const shouldUpdate = process.argv.includes("--update");

// ---- 固定種子偽亂數（mulberry32）----
let randomSeed = 0;
function seededRandom() {
  randomSeed |= 0;
  randomSeed = randomSeed + 0x6D2B79F5 | 0;
  let mixed = Math.imul(randomSeed ^ randomSeed >>> 15, 1 | randomSeed);
  mixed = mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed) ^ mixed;
  return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
}
Math.random = seededRandom;
const reseed = value => { randomSeed = value; };

// ---- 記憶體 localStorage（每組種子前重設）----
let memoryStore = new Map();
globalThis.localStorage = {
  getItem: key => memoryStore.has(key) ? memoryStore.get(key) : null,
  setItem: (key, value) => memoryStore.set(key, String(value)),
  removeItem: key => memoryStore.delete(key)
};
const resetStore = () => { memoryStore = new Map(); };

const { createGame } = await import("../src/game/controller.js");
const { state, util } = await import("../src/systems/state.js");
const { marks } = await import("../src/data/marks.js");
const { breakthrough } = await import("../src/systems/breakthrough.js");
const { cultivation } = await import("../src/systems/cultivation.js");
const { numbers } = await import("../src/data/numbers.js");
const { events } = await import("../src/systems/events.js");
// 存檔模組：重構後在 save.js，重構前在 state.js
const saveModule = existsSync(fileURLToPath(new URL("../src/systems/save.js", import.meta.url)))
  ? (await import("../src/systems/save.js")).save
  : state;

const hashOf = value => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
const outputLines = [];
const record = (...parts) => outputLines.push(parts.join(" "));

// ---- A：simulate.js 的流程（完整凡人期／快速開局）----
function simulateLife(lifeIndex) {
  const game = createGame(() => {});
  game.newLife("測試" + lifeIndex);
  if (lifeIndex % 3 === 0) game.chooseAim(marks.aims[lifeIndex % marks.aims.length].id);
  else {
    game.startMortal();
    let mortalGuard = 0;
    while (!game.s.mortal.finished && mortalGuard++ < 50) {
      if (game.s.mortal.pending) game.mortalPick(0);
      else game.mortalAct(marks.aims[(lifeIndex + game.s.mortal.done) % 2 === 0 ? lifeIndex % 6 : (lifeIndex + 1) % 6].id);
    }
  }
  game.takeTest();
  game.chooseAwakening(0);
  let guard = 0;
  while (game.s && game.s.alive && guard++ < 3000) {
    const gameState = game.s;
    if (gameState.current) {
      if (gameState.current.type === "deviation") game.deviate("散功重修"); else game.pick(0);
      continue;
    }
    if (state.inBottleneck(gameState)) {
      if (gameState.demon > 20) { game.doAction("閉關", true); continue; }
      const targetRate = gameState.realmIndex === 0 ? 0.6 : 0.5;
      if (state.inBottleneck(gameState) && (breakthrough.rate(gameState).rate >= targetRate || gameState.insight > 1500)) {
        game.ui.bt = { material: Object.keys(gameState.materials)[0] || "", env: "洞府" };
        game.doBreakthrough();
      } else game.doAction("閉關", true);
      continue;
    }
    if (gameState.demoEnd) { game.retire(); continue; }
    // 偶爾只修一季、偶爾存讀檔（測 save/load 往返）
    if (guard % 7 === 0) { game.continueLife(); }
    game.doAction(guard % 5 === 0 ? "遊歷" : (guard % 11 === 0 ? "周天" : "吐納"), guard % 13 !== 0);
  }
  const finalState = game.s;
  record("sim", lifeIndex, finalState.cause, state.stageName(finalState), Math.floor(state.age(finalState)), finalState.turns, finalState.stats.breakFails, finalState.eventsDone.length, finalState.notes.length, hashOf(finalState));
  // 傳承：選前兩頁筆記
  game.ui.picks = [0, 1];
  game.bequeath();
  record("legacy", lifeIndex, hashOf(saveModule.loadLegacy()));
}

// ---- B：balance.js 的玩家流程 ----
const playerProfiles = {
  小心: { respect: 0.95, target: 0.85, mix: { 閉關: 4, 周天: 1, 遊歷: 3, 吐納: 2 } },
  普通: { respect: 0.70, target: 0.70, mix: { 閉關: 4, 周天: 3, 遊歷: 2, 吐納: 1 } },
  莽撞: { respect: 0.25, target: 0.50, mix: { 閉關: 3, 周天: 5, 遊歷: 2, 吐納: 0 } }
};
function playLife(profileName, profile, lifeIndex) {
  const game = createGame(() => {});
  game.newLife("測" + lifeIndex);
  game.chooseAim(marks.aims[lifeIndex % marks.aims.length].id);
  game.takeTest();
  game.chooseAwakening(0);
  game.s.notice = null;
  let guard = 0;
  while (game.s.alive && !game.s.demoEnd && guard++ < 4000) {
    const gameState = game.s;
    gameState.notice = null;
    if (gameState.current) {
      if (gameState.current.type === "deviation") game.deviate(util.chance(profile.respect) ? "散功重修" : util.pick(["硬撐", "入魔"]));
      else if (gameState.current.type === "event") {
        const eventDef = events.find(gameState.current.id);
        const choiceCount = events.choices(gameState, eventDef).length;
        game.pick(Math.floor(Math.random() * choiceCount));
      } else game.pick(0);
      continue;
    }
    const secludeCost = cultivation.secludeCost(gameState);
    const isCareful = util.chance(profile.respect);
    const lifeLeft = state.maxAge(gameState) - state.age(gameState);
    if (state.inBottleneck(gameState)) {
      const breakRate = breakthrough.rate(gameState);
      const isOld = state.aging(gameState).ratio > 0.7;
      if (breakRate.rate >= profile.target || lifeLeft < 8 || (isOld && breakRate.rate >= 0.4) || (!isCareful && breakRate.forced)) {
        game.ui.bt = { material: Object.keys(gameState.materials)[0] || "", env: "洞府" };
        game.doBreakthrough();
        continue;
      }
    }
    let action;
    if (isCareful && gameState.injury > 0) action = "吐納";
    else if (isCareful && cultivation.secretOpen(gameState)) action = "遊歷";
    else if (isCareful && gameState.demon >= numbers.demon.gate) action = gameState.stones >= secludeCost ? "閉關" : "吐納";
    else if (isCareful && (gameState.secludeStreak || 0) >= 2) action = "遊歷";
    else action = util.weightedDistinct(Object.entries(profile.mix), entry => entry[1], 1)[0][0];
    if (action === "閉關" && gameState.stones < secludeCost && isCareful) action = "遊歷";
    game.doAction(action, true);
  }
  const finalState = game.s;
  record("bal", profileName, lifeIndex, finalState.demoEnd ? "金丹圓滿" : finalState.cause, state.stageName(finalState), Math.floor(state.age(finalState)), finalState.turns, finalState.route, hashOf(finalState), hashOf(finalState.log.slice(0, 5)));
}

for (const seedValue of [1, 2, 3]) {
  reseed(seedValue);
  resetStore();
  for (let lifeIndex = 0; lifeIndex < 12; lifeIndex++) simulateLife(lifeIndex);
  for (const [profileName, profile] of Object.entries(playerProfiles)) {
    for (let lifeIndex = 0; lifeIndex < 10; lifeIndex++) playLife(profileName, profile, lifeIndex);
  }
}

// ---- C：舊格式存檔載入 ----
reseed(99);
resetStore();
const legacyV0Save = { name: "舊檔", alive: true, phase: "play", startAge: 14, seasons: 23, seasonIdx: 3, realmIndex: 1, stageIndex: 2, xiu: 120.5, insight: 0, insightBank: 0, demon: 12, scars: 1, fails: 1, injury: 0, root: { type: "dual", label: "雙靈根", elements: ["火", "木"] }, technique: "基礎吐納法", techniques: ["基礎吐納法"], materials: { 雷擊木: 1 }, artifacts: [], stones: 33, abilities: [], growth: [], constitutions: [], envs: ["洞府"], karma: [], notes: [], flags: {}, eventsDone: [], queue: [], current: null, log: [], turns: 40, secretAt: 30 };
const legacyV1Save = { v: 1, name: "一版", alive: true, phase: "play", seasons: 5, tend: { 正邪: 3 }, stats: {} };
record("migrate0", JSON.stringify(saveModule.migrate(JSON.parse(JSON.stringify(legacyV0Save)))));
record("migrate1", JSON.stringify(saveModule.migrate(JSON.parse(JSON.stringify(legacyV1Save)))));
record("migrateBad", JSON.stringify(saveModule.migrate(null)), JSON.stringify(saveModule.migrate([1, 2])));
record("legacyNull", JSON.stringify(saveModule.migrateLegacy(null)));
record("legacyOld", JSON.stringify(saveModule.migrateLegacy({ lives: [{ name: "x" }] })));
// 透過 controller 載入舊檔
localStorage.setItem("xiuxian-demo-save-v1", JSON.stringify(legacyV0Save));
localStorage.setItem("xiuxian-demo-legacy-v1", JSON.stringify({ pending: [{ text: "a", from: "前人" }] }));
{
  const game = createGame(() => {});
  game.continueLife();
  record("continue", hashOf(game.s), game.s.v, game.s.route, JSON.stringify(game.s.tend));
  game.doAction("遊歷", true);
  record("continueAct", hashOf(game.s), game.s.lastText.replace(/\n/g, "|"));
  const sortedEntries = [...memoryStore.entries()].sort();
  record("store", JSON.stringify(sortedEntries).length, hashOf(sortedEntries));
  game.wipe();
  record("wipe", JSON.stringify([...memoryStore.entries()].sort()));
}

const actualText = outputLines.join("\n") + "\n";
if (shouldUpdate) {
  writeFileSync(baselinePath, actualText, "utf8");
  console.log(`已更新黃金檔：${baselinePath}（${outputLines.length} 行）`);
} else {
  if (!existsSync(baselinePath)) {
    console.error(`找不到黃金檔：${baselinePath}`);
    process.exit(1);
  }
  const expectedLines = readFileSync(baselinePath, "utf8").replace(/\r\n/g, "\n").split("\n");
  const actualLines = actualText.split("\n");
  const lineTotal = Math.max(expectedLines.length, actualLines.length);
  for (let lineIndex = 0; lineIndex < lineTotal; lineIndex++) {
    if (expectedLines[lineIndex] !== actualLines[lineIndex]) {
      console.error(`行為與黃金檔不一致，第 ${lineIndex + 1} 行：`);
      console.error("  預期：" + expectedLines[lineIndex]);
      console.error("  實際：" + actualLines[lineIndex]);
      console.error("若是刻意改了規則／數值／存檔格式，請見檔頭說明後以 --update 更新黃金檔。");
      process.exit(1);
    }
  }
  console.log(`行為與黃金檔一致（${outputLines.length} 行）`);
}
