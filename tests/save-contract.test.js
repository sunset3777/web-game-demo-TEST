// 存檔／傳承契約測試：描述「現在」存檔系統的行為，防止重構或改欄位時悄悄弄壞舊存檔。
// 標著「已知問題」註解的測試，是審查（docs/設計討論/10_Codex新人審查.md 第 4 節）指出的問題，
// 寫的是「期望的正確行為」，目前會失敗，npm test 會因此顯示紅燈；問題修好後它們自然通過。
import { test } from "node:test";
import assert from "node:assert/strict";
import { save, SAVE_VERSION } from "../src/systems/save.js";
import { state } from "../src/systems/state.js";
import { createGame } from "../src/game/controller.js";
import { installMemoryStorage } from "./helpers/memoryStorage.js";
import { playOneLife } from "./helpers/playLife.js";

// 做一份「剛建立」的存檔資料，再依需要拿掉欄位，模擬舊版存檔
function createOldSaveWithoutFields(fieldNamesToRemove, { version } = {}) {
  const oldSave = state.create("舊檔修士");
  oldSave.stones = 77;
  oldSave.realmIndex = 1;
  oldSave.notes = [{ when: "20 歲・春", text: "舊筆記", kind: "一般", realm: "煉氣" }];
  fieldNamesToRemove.forEach(fieldName => { delete oldSave[fieldName]; });
  if (version === undefined) delete oldSave.v; else oldSave.v = version;
  return oldSave;
}

test("存檔版本號與 localStorage key 字串固定不變（改名會讓玩家舊存檔失效）", () => {
  assert.equal(SAVE_VERSION, 1);
  assert.equal(save.SAVE_VERSION, 1);
  assert.equal(save.SAVE_KEY, "xiuxian-demo-save-v1");
  assert.equal(save.LEGACY_KEY, "xiuxian-demo-legacy-v1");
});

test("沒有版本號的舊存檔：載入後補齊缺的欄位、版本號變成現版，既有欄位不變", () => {
  const storage = installMemoryStorage();
  const oldSave = createOldSaveWithoutFields(["tend", "recentEvents", "route", "eventsDone"]);
  storage.setItem(save.SAVE_KEY, JSON.stringify(oldSave));

  const loaded = save.load();
  const freshDefaults = state.create("舊檔修士");
  assert.equal(loaded.v, SAVE_VERSION);
  assert.deepEqual(loaded.tend, freshDefaults.tend);
  assert.deepEqual(loaded.recentEvents, []);
  assert.equal(loaded.route, "氣修");
  assert.deepEqual(loaded.eventsDone, []);
  assert.equal(loaded.name, "舊檔修士");
  assert.equal(loaded.stones, 77);
  assert.equal(loaded.realmIndex, 1);
  assert.equal(loaded.notes[0].text, "舊筆記");
});

test("版本號為 1 但缺欄位的存檔：照樣補齊，既有欄位不變", () => {
  const storage = installMemoryStorage();
  const oldSave = createOldSaveWithoutFields(["legacyAvailable", "stats", "flags"], { version: 1 });
  storage.setItem(save.SAVE_KEY, JSON.stringify(oldSave));

  const loaded = save.load();
  assert.equal(loaded.legacyAvailable, false);
  assert.deepEqual(loaded.stats, { breakFails: 0 });
  assert.deepEqual(loaded.flags, {});
  assert.equal(loaded.stones, 77);
});

test("巢狀物件缺子欄位時只補缺的那一個，已有的值不動", () => {
  const storage = installMemoryStorage();
  const oldSave = createOldSaveWithoutFields([]);
  oldSave.tend = { act: { 吐納: 9 }, 正邪: 3 };
  storage.setItem(save.SAVE_KEY, JSON.stringify(oldSave));

  const loaded = save.load();
  assert.equal(loaded.tend.act.吐納, 9);
  assert.equal(loaded.tend.act.周天, 0);
  assert.equal(loaded.tend.正邪, 3);
  assert.equal(loaded.tend.穩躁, 0);
});

test("存檔內容無法解析成 JSON 時：load 回傳 null，不丟例外", () => {
  const storage = installMemoryStorage();
  storage.setItem(save.SAVE_KEY, "{壞掉的檔案");
  assert.equal(save.load(), null);
});

test("存檔 JSON 可解析但不是物件：null 回傳 null；陣列、數字、字串原樣回傳（不驗證形狀）", () => {
  const storage = installMemoryStorage();
  storage.setItem(save.SAVE_KEY, "null");
  assert.equal(save.load(), null);

  storage.setItem(save.SAVE_KEY, "[1,2]");
  assert.deepEqual(save.load(), [1, 2]);

  storage.setItem(save.SAVE_KEY, "123");
  assert.equal(save.load(), 123);

  storage.setItem(save.SAVE_KEY, "\"abc\"");
  assert.equal(save.load(), "abc");
});

test("沒有存檔時 load 回傳 null", () => {
  installMemoryStorage();
  assert.equal(save.load(), null);
});

test("既有欄位形狀錯誤（例如 notes 是 null）時：不修正，原樣留著", () => {
  const storage = installMemoryStorage();
  const brokenSave = createOldSaveWithoutFields([], { version: 1 });
  brokenSave.notes = null;
  brokenSave.realmIndex = 99;
  storage.setItem(save.SAVE_KEY, JSON.stringify(brokenSave));

  const loaded = save.load();
  assert.equal(loaded.notes, null);
  assert.equal(loaded.realmIndex, 99);
});

test("存檔後讀回：內容與存入的遊戲狀態完全一致", () => {
  const { game } = playOneLife({ seed: 1, openingMode: "quick", stopWhen: (runningGame) => runningGame.s.turns >= 10 });
  save.save(game.s);
  assert.deepEqual(save.load(), JSON.parse(JSON.stringify(game.s)));
});

test("存檔寫進 localStorage 的是 JSON 字串，而且在固定的 key 底下", () => {
  const storage = installMemoryStorage();
  const gameState = state.create("寫入測試");
  save.save(gameState);
  assert.deepEqual(storage.keys(), ["xiuxian-demo-save-v1"]);
  assert.equal(JSON.parse(storage.getItem(save.SAVE_KEY)).name, "寫入測試");
});

test("clear 只刪存檔，不動傳承檔", () => {
  const storage = installMemoryStorage();
  save.save(state.create("甲"));
  save.saveLegacy({ lives: [], pending: [] });
  save.clear();
  assert.equal(storage.getItem(save.SAVE_KEY), null);
  assert.notEqual(storage.getItem(save.LEGACY_KEY), null);
});

// ---- 傳承檔 ----

test("傳承檔不存在或內容是 null：回傳空傳承（lives、pending 為空陣列，帶現版號）", () => {
  const storage = installMemoryStorage();
  assert.deepEqual(save.loadLegacy(), { v: SAVE_VERSION, lives: [], pending: [] });
  storage.setItem(save.LEGACY_KEY, "null");
  assert.deepEqual(save.loadLegacy(), { v: SAVE_VERSION, lives: [], pending: [] });
});

test("傳承檔是陣列、數字或壞掉的 JSON：一律當成空傳承", () => {
  const storage = installMemoryStorage();
  for (const brokenContent of ["[1]", "5", "{壞掉"]) {
    storage.setItem(save.LEGACY_KEY, brokenContent);
    assert.deepEqual(save.loadLegacy(), { v: SAVE_VERSION, lives: [], pending: [] }, brokenContent);
  }
});

test("傳承檔缺欄位：補齊 lives、pending，既有內容不動", () => {
  const storage = installMemoryStorage();
  storage.setItem(save.LEGACY_KEY, JSON.stringify({ lives: [{ name: "前人" }] }));
  const loaded = save.loadLegacy();
  assert.deepEqual(loaded.lives, [{ name: "前人" }]);
  assert.deepEqual(loaded.pending, []);
  assert.equal(loaded.v, SAVE_VERSION);
});

test("傳承檔寫入後讀回一致，且寫入時會蓋上現版版本號", () => {
  const storage = installMemoryStorage();
  const legacyData = { lives: [{ name: "甲" }], pending: [{ text: "一頁", from: "甲" }] };
  save.saveLegacy(legacyData);
  assert.equal(JSON.parse(storage.getItem(save.LEGACY_KEY)).v, SAVE_VERSION);
  assert.deepEqual(save.loadLegacy(), { v: SAVE_VERSION, lives: legacyData.lives, pending: legacyData.pending });
});

// ---- wipe ----

test("wipe（清除所有存檔）：存檔 key 消失，傳承 key 變成空傳承，並留下提示文字", () => {
  const storage = installMemoryStorage();
  const game = createGame(() => {});
  game.newLife("要被清掉的人");
  save.saveLegacy({ lives: [{ name: "前人" }], pending: [{ text: "x" }] });

  game.wipe();
  assert.equal(storage.getItem(save.SAVE_KEY), null);
  assert.deepEqual(JSON.parse(storage.getItem(save.LEGACY_KEY)), { lives: [], pending: [], v: SAVE_VERSION });
  assert.equal(game.s, null);
  assert.equal(game.flash, "已清除所有存檔與傳承紀錄。");
});

// ---- 寫入失敗 ----

test("localStorage 寫入丟例外時：save 吞掉例外、不寫入，也不影響舊內容", () => {
  const storage = installMemoryStorage();
  save.save(state.create("舊的"));
  const before = storage.getItem(save.SAVE_KEY);
  storage.shouldThrowOnWrite = true;

  assert.doesNotThrow(() => save.save(state.create("新的")));
  assert.equal(storage.getItem(save.SAVE_KEY), before);
});

test("localStorage 寫入丟例外時：saveLegacy 吞掉例外，不寫入，呼叫端得不到失敗訊息", () => {
  const storage = installMemoryStorage();
  storage.shouldThrowOnWrite = true;
  let returnedValue;
  assert.doesNotThrow(() => { returnedValue = save.saveLegacy({ lives: [], pending: [] }); });
  assert.equal(returnedValue, undefined);
  assert.equal(storage.getItem(save.LEGACY_KEY), null);
});

// ---- 死亡後的存檔（審查 4-1）----

test("死亡後存檔寫成結局狀態：alive=false、phase=end、死因與遊戲狀態一致，不再是死前那份活著的進度", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  assert.equal(game.s.alive, false);
  assert.notEqual(storage.getItem(save.SAVE_KEY), null);
  const savedAfterDeath = save.load();
  assert.equal(savedAfterDeath.alive, false);
  assert.equal(savedAfterDeath.phase, "end");
  assert.equal(savedAfterDeath.cause, game.s.cause);
  assert.deepEqual(savedAfterDeath, JSON.parse(JSON.stringify(game.s)));
});

// 死亡後的行為：標題不能再讀回死前的進度（審查 4-1）
test("死亡後標題不該再出現「繼續」（存檔應被清掉或標成已死）", () => {
  playOneLife({ seed: 1, openingMode: "quick" });
  const savedAfterDeath = save.load();
  assert.ok(savedAfterDeath === null || savedAfterDeath.alive === false);
});

test("死亡後重新開啟：returnToLifeEnding 讀回結局狀態，仍可選筆記傳承；傳承成功後存檔才被清掉", () => {
  const { game: finishedGame, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  const reopenedGame = createGame(() => {});
  reopenedGame.returnToLifeEnding();
  assert.equal(reopenedGame.s.alive, false);
  assert.equal(reopenedGame.s.cause, finishedGame.s.cause);
  reopenedGame.ui.picks = [0, 1];
  reopenedGame.bequeath();
  assert.equal(storage.getItem(save.SAVE_KEY), null);
  assert.equal(save.loadLegacy().pending.length, 2);
  assert.match(reopenedGame.flash, /留下了 2 頁筆記/);
});

test("存檔是活著的進度時，returnToLifeEnding 不做事（不能拿它繞過「繼續」）", () => {
  installMemoryStorage();
  save.save(state.create("還活著"));
  const game = createGame(() => {});
  game.returnToLifeEnding();
  assert.equal(game.s, null);
});

// ---- 已知問題 (b)：傳承寫入失敗仍清舊存檔 ----

test("現況：傳承檔寫入失敗時，bequeath 仍會清掉舊存檔，傳承也沒落盤", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  assert.notEqual(storage.getItem(save.SAVE_KEY), null);
  storage.shouldThrowOnWrite = true;
  game.ui.picks = [0, 1];
  game.bequeath();
  assert.equal(storage.getItem(save.SAVE_KEY), null);
  assert.equal(storage.getItem(save.LEGACY_KEY), null);
  assert.match(game.flash, /留下了 2 頁筆記/);
});

// 已知問題（目前會失敗，修好後才會通過）：對應審查 4-2：saveLegacy 吞掉寫入例外，bequeath 無條件清舊存檔。期望：傳承檔寫入失敗時保留舊存檔，且不提示玩家已留下筆記
test("傳承檔寫入失敗時，不該清掉舊存檔，也不該告訴玩家已留下筆記", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  storage.shouldThrowOnWrite = true;
  game.ui.picks = [0, 1];
  game.bequeath();
  assert.notEqual(storage.getItem(save.SAVE_KEY), null);
  assert.doesNotMatch(game.flash, /留下了/);
});

// ---- 已知問題 (c)：較新版本存檔被降回現版本 ----

test("現況：載入版本號比程式新的存檔，版本號會被改回現版，其餘未知欄位保留", () => {
  const storage = installMemoryStorage();
  const newerSave = createOldSaveWithoutFields([], { version: SAVE_VERSION + 4 });
  newerSave.futureOnlyField = { hello: "未來欄位" };
  storage.setItem(save.SAVE_KEY, JSON.stringify(newerSave));

  const loaded = save.load();
  assert.equal(loaded.v, SAVE_VERSION);
  assert.deepEqual(loaded.futureOnlyField, { hello: "未來欄位" });
});

// 已知問題（目前會失敗，修好後才會通過）：對應審查 4-6：save.migrate 對任何物件都把 v 設成現版。期望：版本比程式新的存檔保留原版本號，或拒絕載入（回傳 null）
test("載入版本號比程式新的存檔時，不該把版本號降回現版（應保留或拒絕載入）", () => {
  const storage = installMemoryStorage();
  const newerSave = createOldSaveWithoutFields([], { version: SAVE_VERSION + 4 });
  storage.setItem(save.SAVE_KEY, JSON.stringify(newerSave));
  const loaded = save.load();
  assert.ok(loaded === null || loaded.v === SAVE_VERSION + 4);
});
