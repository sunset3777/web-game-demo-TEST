// 存檔／傳承契約測試：描述「現在」存檔系統的行為，防止重構或改欄位時悄悄弄壞舊存檔。
// 死亡後的存檔、傳承寫入失敗、較新版本存檔三段，對應審查（docs/設計討論/10_Codex新人審查.md 第 4 節）
// 4-1、4-2、4-6 指出並已修掉的問題，測試寫的是設計者定案後的正確行為。
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

test("localStorage 寫入丟例外時：saveLegacy 不丟例外、不寫入，並回報 false 讓呼叫端知道失敗", () => {
  const storage = installMemoryStorage();
  storage.shouldThrowOnWrite = true;
  let returnedValue;
  assert.doesNotThrow(() => { returnedValue = save.saveLegacy({ lives: [], pending: [] }); });
  assert.equal(returnedValue, false);
  assert.equal(storage.getItem(save.LEGACY_KEY), null);
});

test("saveLegacy 寫入成功時回報 true", () => {
  installMemoryStorage();
  assert.equal(save.saveLegacy({ lives: [], pending: [] }), true);
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

// ---- 傳承寫入失敗（審查 4-2）----

test("傳承檔寫入失敗時：舊存檔原樣保留、傳承沒落盤，game.s 仍是結局狀態，玩家收到存檔失敗的提示", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  const saveBefore = storage.getItem(save.SAVE_KEY);
  storage.shouldThrowOnWrite = true;
  game.ui.picks = [0, 1];
  game.bequeath();
  assert.equal(storage.getItem(save.SAVE_KEY), saveBefore);
  assert.equal(storage.getItem(save.LEGACY_KEY), null);
  assert.equal(game.s.alive, false);
  assert.deepEqual(game.ui.picks, [0, 1]);
  assert.equal(game.flash, "存檔失敗，舊存檔仍保留，請稍後再試。");
});

// 傳承寫入失敗時的行為：不清舊存檔、不謊稱已留下筆記（審查 4-2）
test("傳承檔寫入失敗時，不該清掉舊存檔，也不該告訴玩家已留下筆記", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  storage.shouldThrowOnWrite = true;
  game.ui.picks = [0, 1];
  game.bequeath();
  assert.notEqual(storage.getItem(save.SAVE_KEY), null);
  assert.doesNotMatch(game.flash, /留下了/);
});

test("傳承檔寫入失敗後儲存空間恢復，再按一次就能傳下去，筆記只記一次", () => {
  const { game, storage } = playOneLife({ seed: 1, openingMode: "quick" });
  storage.shouldThrowOnWrite = true;
  game.ui.picks = [0, 1];
  game.bequeath();
  storage.shouldThrowOnWrite = false;
  game.bequeath();
  assert.equal(storage.getItem(save.SAVE_KEY), null);
  assert.equal(game.s, null);
  assert.match(game.flash, /留下了 2 頁筆記/);
  const legacyFile = save.loadLegacy();
  assert.equal(legacyFile.lives.length, 1);
  assert.equal(legacyFile.pending.length, 2);
});

// ---- 較新版本的存檔（審查 4-6）----

// 放一份「較新版本程式寫下」的存檔與傳承檔進 localStorage，回傳寫進去的原始字串，方便比對沒被動過
function installNewerVersionFiles({ withSave = true, withLegacy = false } = {}) {
  const storage = installMemoryStorage();
  const newerSave = createOldSaveWithoutFields([], { version: SAVE_VERSION + 4 });
  newerSave.futureOnlyField = { hello: "未來欄位" };
  if (withSave) storage.setItem(save.SAVE_KEY, JSON.stringify(newerSave));
  if (withLegacy) storage.setItem(save.LEGACY_KEY, JSON.stringify({ v: SAVE_VERSION + 4, lives: [{ name: "未來人" }], pending: [{ text: "未來筆記" }] }));
  return { storage, newerSaveText: storage.getItem(save.SAVE_KEY), newerLegacyText: storage.getItem(save.LEGACY_KEY) };
}

// 較新版本存檔的行為：拒絕載入，不降版（審查 4-6）
test("載入版本號比程式新的存檔時，不該把版本號降回現版（應保留或拒絕載入）", () => {
  const storage = installMemoryStorage();
  const newerSave = createOldSaveWithoutFields([], { version: SAVE_VERSION + 4 });
  storage.setItem(save.SAVE_KEY, JSON.stringify(newerSave));
  const loaded = save.load();
  assert.ok(loaded === null || loaded.v === SAVE_VERSION + 4);
});

test("較新版本的存檔：load 回傳 null、hasNewerSave 為 true，localStorage 裡的原檔（版本號與未知欄位）一字不動", () => {
  const { storage, newerSaveText } = installNewerVersionFiles();
  assert.equal(save.load(), null);
  assert.equal(save.hasNewerSave(), true);
  assert.equal(storage.getItem(save.SAVE_KEY), newerSaveText);
});

test("較新版本的存檔：migrate 不把版本號降回現版，也不補欄位", () => {
  const newerSave = { v: SAVE_VERSION + 4, name: "未來", futureOnlyField: 1 };
  assert.deepEqual(save.migrate(JSON.parse(JSON.stringify(newerSave))), newerSave);
});

test("較新版本的存檔：save.save 不覆蓋它並回報 false，clear 也不刪它", () => {
  const { storage, newerSaveText } = installNewerVersionFiles();
  assert.equal(save.save(state.create("舊版程式的人")), false);
  save.clear();
  assert.equal(storage.getItem(save.SAVE_KEY), newerSaveText);
});

test("save.save 正常寫入時回報 true", () => {
  installMemoryStorage();
  assert.equal(save.save(state.create("甲")), true);
});

test("較新版本的存檔：開始新的一生被擋下，不會蓋掉它，並提示玩家原因", () => {
  const { storage, newerSaveText } = installNewerVersionFiles();
  const game = createGame(() => {});
  game.newLife("想開新局的人");
  assert.equal(game.s, null);
  assert.equal(storage.getItem(save.SAVE_KEY), newerSaveText);
  assert.equal(game.flash, "為了不蓋掉較新版本的存檔，這裡不能開始新的一生。");
});

test("較新版本的存檔：continueLife 讀不到進度，停在標題（game.s 為 null）", () => {
  installNewerVersionFiles();
  const game = createGame(() => {});
  game.continueLife();
  assert.equal(game.s, null);
});

test("較新版本的傳承檔：loadLegacy 當成空傳承、不降版，saveLegacy 不覆蓋並回報 false，開新的一生也被擋下", () => {
  const { storage, newerLegacyText } = installNewerVersionFiles({ withSave: false, withLegacy: true });
  assert.deepEqual(save.loadLegacy(), { v: SAVE_VERSION, lives: [], pending: [] });
  assert.equal(save.hasNewerLegacy(), true);
  assert.equal(save.saveLegacy({ lives: [], pending: [] }), false);
  const game = createGame(() => {});
  game.newLife("想開新局的人");
  assert.equal(game.s, null);
  assert.equal(storage.getItem(save.LEGACY_KEY), newerLegacyText);
  assert.equal(storage.getItem(save.SAVE_KEY), null);
});

test("較新版本的存檔與傳承檔：玩家明確按「清除所有存檔與傳承」才會刪掉，之後可以重新開始", () => {
  const { storage } = installNewerVersionFiles({ withSave: true, withLegacy: true });
  const game = createGame(() => {});
  game.wipe();
  assert.equal(storage.getItem(save.SAVE_KEY), null);
  assert.deepEqual(JSON.parse(storage.getItem(save.LEGACY_KEY)), { lives: [], pending: [], v: SAVE_VERSION });
  game.newLife("重新開始的人");
  assert.equal(game.s.name, "重新開始的人");
});
