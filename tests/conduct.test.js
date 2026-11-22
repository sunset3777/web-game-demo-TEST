// 作派（善惡、正邪、穩躁三軸）的規則測試：門檻、修練行動的 ±40 上限、邪選項幅度、正道盤查與仇家、筆記終值。
// 數值都從 numbers.js 讀，衡天之後微調數字時，這裡驗的是「規則有照數字走」，不用跟著改。
import { test } from "node:test";
import assert from "node:assert/strict";
import { installMemoryStorage } from "./helpers/memoryStorage.js";
import { withSeededRandom } from "./helpers/seededRandom.js";
import { createGame } from "../src/game/controller.js";
import { marks } from "../src/data/marks.js";
import { numbers } from "../src/data/numbers.js";
import { routes } from "../src/systems/routes.js";
import { events } from "../src/systems/events.js";
import { legacy } from "../src/systems/legacy.js";

const conduct = numbers.conduct;

// 快速開局到修練畫面，回傳 game（固定種子，結果可重現）
function startCultivatingLife(name = "作派測試") {
  installMemoryStorage();
  return withSeededRandom(7, () => {
    const game = createGame(() => {});
    game.newLife(name);
    game.chooseAim(marks.aims[0].id);
    game.takeTest();
    game.chooseAwakening(0);
    game.s.notice = null;
    return game;
  });
}
const setConduct = (gameState, values) => Object.assign(gameState.tend, values);
// 依選項文字選擇事件選項，回傳結果文字
function chooseOption(gameState, eventId, optionLabel) {
  const event = events.find(eventId);
  const optionIndex = events.choices(gameState, event).findIndex(option => option.label === optionLabel);
  assert.ok(optionIndex >= 0, `${eventId} 找不到選項「${optionLabel}」`);
  return events.resolve(gameState, event, optionIndex);
}

test("新的一世三軸都從 0 開始；舊存檔沒有善惡時，舊正邪搬進善惡、正邪歸 0", async () => {
  const { save } = await import("../src/systems/save.js");
  const gameState = startCultivatingLife().s;
  assert.deepEqual([gameState.tend.善惡, gameState.tend.正邪, gameState.tend.穩躁], [0, 0, 0]);
  // 存檔遷移（玄機選 (a)）：舊的「正邪」其實同時記著善行，搬進善惡
  for (const [oldRighteousness, expected] of [[35, [35, 0]], [-42, [-42, 0]], [0, [0, 0]]]) {
    const oldSave = JSON.parse(JSON.stringify(gameState));
    oldSave.v = 1;                                                                // 拆軸前（第 1 版）的存檔
    oldSave.tend = { act: oldSave.tend.act, 正邪: oldRighteousness, 穩躁: 12 };   // 拆軸前的形狀：沒有善惡
    const loaded = save.migrate(oldSave);
    assert.deepEqual([loaded.tend.善惡, loaded.tend.正邪, loaded.tend.穩躁], [expected[0], expected[1], 12], `舊正邪 ${oldRighteousness}`);
  }
  // 已經有善惡的新存檔：不動
  const newSave = JSON.parse(JSON.stringify(gameState));
  newSave.tend.善惡 = 10; newSave.tend.正邪 = -20;
  const reloaded = save.migrate(newSave);
  assert.deepEqual([reloaded.tend.善惡, reloaded.tend.正邪], [10, -20]);
  // 沒經過載入的狀態物件：同一規則
  gameState.tend.正邪 = 18; delete gameState.tend.善惡;
  assert.deepEqual([routes.view(gameState).善惡, routes.view(gameState).正邪], [18, 0]);
});

test("稱號：好心／不好惹看善惡 ±25，活菩薩／心狠手辣看善惡 ±50，魔頭看正邪", () => {
  const gameState = startCultivatingLife().s;
  const titleWith = values => { setConduct(gameState, { 善惡: 0, 正邪: 0, 穩躁: 0, ...values }); return routes.title(gameState); };
  assert.equal(titleWith({ 善惡: 25 }), "好心的修士");
  assert.notEqual(titleWith({ 善惡: 24 }), "好心的修士");
  assert.equal(titleWith({ 善惡: -25 }), "不好惹的修士");
  assert.equal(titleWith({ 善惡: 50 }), "活菩薩");
  assert.equal(titleWith({ 善惡: -50 }), "心狠手辣之人");
  // 正邪不再決定這四個稱號
  assert.notEqual(titleWith({ 正邪: 60 }), "活菩薩");
  assert.notEqual(titleWith({ 正邪: -60 }), "心狠手辣之人");
  gameState.route = "魔修";
  assert.equal(titleWith({ 正邪: -50 }), "魔頭");
});

test("修練行動對穩躁的影響減半，且只能推到 ±40；事件推出去的不會被行動拉回", () => {
  const gameState = startCultivatingLife().s;
  setConduct(gameState, { 穩躁: 0 });
  routes.onAction(gameState, "周天");
  assert.equal(gameState.tend.穩躁, 2 * conduct.actionStepScale);
  for (let i = 0; i < 500; i++) routes.onAction(gameState, "周天");
  assert.equal(gameState.tend.穩躁, conduct.actionStepLimit);
  for (let i = 0; i < 500; i++) routes.onAction(gameState, "閉關");
  assert.equal(gameState.tend.穩躁, -conduct.actionStepLimit);
  // 事件把穩躁推到 60 後，修練行動既不會再往上推，也不會被往下拉回 40（往回走的行動照常生效）
  assert.equal(routes.applyActionStepToTemper(60, 1), 60);
  assert.equal(routes.applyActionStepToTemper(60, -0.5), 59.5);
  assert.equal(routes.applyActionStepToTemper(-60, -1), -60);
  // 事件選項不受 ±40 限制
  setConduct(gameState, { 穩躁: 38 });
  routes.adjust(gameState, "穩躁", 10);
  assert.equal(gameState.tend.穩躁, 48);
});

test("明確作惡、走邪的選項幅度落在 10～15，拒絕魔道的選項加正", () => {
  const game = startCultivatingLife();
  const gameState = game.s;
  const deltaOf = (eventId, optionLabel, before = {}) => {
    setConduct(gameState, { 善惡: 0, 正邪: 0, 穩躁: 0, ...before });
    const start = { ...routes.view(gameState) };
    withSeededRandom(1, () => chooseOption(gameState, eventId, optionLabel));
    const end = routes.view(gameState);
    return { 善惡: end.善惡 - start.善惡, 正邪: end.正邪 - start.正邪 };
  };
  gameState.stones = 100;
  assert.deepEqual(deltaOf("黑市", "買一顆", { 正邪: -20 }), { 善惡: -5, 正邪: -15 });
  assert.deepEqual(deltaOf("魔音入耳", "讓它進來"), { 善惡: 0, 正邪: -12 });
  assert.deepEqual(deltaOf("被欺凌的散修", "趁亂把靈草搶走"), { 善惡: -10, 正邪: 0 });
  assert.ok(gameState.karma.some(entry => entry.id === "搶散修靈草" && entry.weight === "中"), "搶靈草要記一筆中因果");
  // 拒絕魔道
  assert.equal(deltaOf("心魔低語", "默誦清心訣").正邪, 4);
  assert.equal(deltaOf("黑市", "看看就走", { 正邪: -20 }).正邪, 5);
  assert.equal(deltaOf("魔音入耳", "斬斷雜念").正邪, 6);
  // 善行歸善惡，不再算進正邪
  assert.deepEqual(deltaOf("鄰家求藥", "推說自己也沒有"), { 善惡: -3, 正邪: 0 });
  gameState.flags["魔種"] = true; gameState.realmIndex = 2;
  assert.equal(deltaOf("魔種萌芽", "順著它，改修魔功", { 正邪: -30 }).正邪, -15);
});

test("仇家機率：只算未了結的「仇」類中、大因果；偏惡先加乘再封頂", () => {
  const gameState = startCultivatingLife().s;
  const enemy = conduct.enemy;
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
  setConduct(gameState, { 善惡: 0 });
  gameState.karma = [];
  assert.equal(routes.enemyChance(gameState), 0);
  gameState.karma = [
    { id: "a", weight: "中", kind: "仇" }, { id: "b", weight: "中", kind: "仇" }, { id: "c", weight: "小", kind: "仇" },
    { id: "d", weight: "中", kind: "仇", done: true }, { id: "e", weight: "中", kind: "仇", faded: true },
    { id: "f", weight: "中", kind: "恩" }, { id: "g", weight: "大", kind: "欠" }
  ];
  near(routes.enemyChance(gameState), 2 * enemy.chancePerKarma["中"]);
  // 行善結下的恩、欠別人的人情都不會招來仇家
  gameState.karma = [{ id: "救山道老者", weight: "中" }, { id: "救小荷", weight: "中" }];
  assert.equal(routes.enemyChance(gameState), 0, "沒有種類欄位的舊因果照對照表判斷，救人是恩");
  // 一般封頂
  gameState.karma = Array.from({ length: 10 }, (_, i) => ({ id: "big" + i, weight: "大", kind: "仇" }));
  assert.equal(routes.enemyChance(gameState), enemy.chanceCap);
  // 偏惡：先乘再封頂（較高的上限）
  setConduct(gameState, { 善惡: enemy.evilAt });
  assert.equal(routes.enemyChance(gameState), enemy.evilChanceCap);
  gameState.karma = [{ id: "a", weight: "中", kind: "仇" }];
  near(routes.enemyChance(gameState), enemy.chancePerKarma["中"] * enemy.evilMultiplier);
});

test("新記下的因果帶種類；舊存檔的因果載入時照對照表補上恩／仇／欠", async () => {
  const { save } = await import("../src/systems/save.js");
  const { karmaData } = await import("../src/data/karma.js");
  const gameState = startCultivatingLife().s;
  gameState.karma = [];
  events.addKarma(gameState, "搶散修靈草", "搶靈草", "中");
  events.addKarma(gameState, "救山道老者", "救老者", "中");
  assert.deepEqual(gameState.karma.map(entry => entry.kind), ["仇", "恩"]);
  // 舊存檔：沒有 kind 欄位
  const oldSave = JSON.parse(JSON.stringify(gameState));
  oldSave.karma = [
    { id: "搶散修靈草", text: "搶靈草", weight: "中", born: 0, done: false },
    { id: "救小荷", text: "救小荷", weight: "中", born: 0, done: false },
    { id: "測試用欠人情", text: "欠了人情", weight: "中", born: 0, done: false },
    { id: "沒在表上的舊因果", text: "？", weight: "小", born: 0, done: false },
    { id: "已有種類", text: "不動", weight: "小", kind: "仇", born: 0, done: false }
  ];
  karmaData.kindById["測試用欠人情"] = "欠";   // 只在這個測試裡加，驗證三類都會補
  try {
    const loaded = save.migrate(oldSave);
    assert.deepEqual(loaded.karma.map(entry => entry.kind), ["仇", "恩", "欠", karmaData.defaultKind, "仇"]);
  } finally { delete karmaData.kindById["測試用欠人情"]; }
});

test("宗門指點改看善惡 ≥ 20", () => {
  const gameState = startCultivatingLife().s;
  const isAvailable = () => events.available(gameState, "遊歷").some(event => event.id === "宗門指點");
  setConduct(gameState, { 善惡: 19, 正邪: 60 });
  assert.equal(isAvailable(), false);
  setConduct(gameState, { 善惡: 20, 正邪: 0 });
  assert.equal(isAvailable(), true);
});

test("一世結束時三項終值寫進筆記，下一世從 0 開始", () => {
  const game = startCultivatingLife("前一世");
  setConduct(game.s, { 善惡: 30, 正邪: -60, 穩躁: 10 });
  legacy.die(game.s, "坐化");
  const conductNote = game.s.notes.find(note => note.kind === "作派");
  assert.ok(conductNote, "要有一頁作派筆記");
  assert.deepEqual(conductNote.conduct, { 善惡: 30, 正邪: -60, 穩躁: 10 });
  assert.equal(conductNote.text, "這一世，世人記得你待人寬厚，受過你恩的人不少，走的是偏路，正道的冊子上有你的名字，該快的時候快，該等的時候也等得住。");
  assert.doesNotMatch(conductNote.text, /\d/, "筆記文字不寫數字（沉浸感）");
  game.ui.picks = []; game.bequeath();
  const nextLife = startCultivatingLife("下一世");
  assert.deepEqual([nextLife.s.tend.善惡, nextLife.s.tend.正邪, nextLife.s.tend.穩躁], [0, 0, 0]);
});

test("宗門指點：恭敬請教加正，一世最多出現 sectGuidanceMaxPerLife 次", () => {
  const gameState = startCultivatingLife().s;
  const isAvailable = () => events.available(gameState, "遊歷").some(event => event.id === "宗門指點");
  setConduct(gameState, { 善惡: 30, 正邪: 0 });
  for (let i = 0; i < conduct.sectGuidanceMaxPerLife; i++) {
    assert.equal(isAvailable(), true, `第 ${i + 1} 次應該還會出現`);
    const before = gameState.tend.正邪;
    chooseOption(gameState, "宗門指點", "恭敬請教");
    assert.equal(gameState.tend.正邪 - before, 3);
  }
  assert.equal(isAvailable(), false, "超過上限就不再出現");
});

test("黑市、魔音入耳：正邪到門檻或善惡夠低（≤ -30）都會出現；魔種萌芽仍只看正邪", () => {
  const gameState = startCultivatingLife().s;
  const has = (eventId, action) => events.available(gameState, action).some(event => event.id === eventId);
  gameState.stones = 100; gameState.demon = 50; gameState.route = "氣修"; gameState.flags["魔種"] = false;
  setConduct(gameState, { 善惡: 0, 正邪: 0 });
  assert.equal(has("黑市", "遊歷"), false);
  setConduct(gameState, { 善惡: conduct.darkPathOpensAtGoodEvil, 正邪: 0 });
  assert.equal(has("黑市", "遊歷"), true, "作惡夠多就會被帶進黑市");
  const demonVoice = events.find("魔音入耳");
  assert.equal(demonVoice.when(gameState), true, "作惡夠多也會聽見魔音");
  setConduct(gameState, { 善惡: conduct.darkPathOpensAtGoodEvil + 1, 正邪: -10 });
  assert.equal(demonVoice.when(gameState), true, "原本的正邪門檻照舊有效");
  // 魔種萌芽：只看正邪
  gameState.flags["魔種"] = true; gameState.realmIndex = 2;
  setConduct(gameState, { 善惡: -100, 正邪: -29 });
  assert.equal(events.find("魔種萌芽").when(gameState), false);
  setConduct(gameState, { 善惡: 0, 正邪: -30 });
  assert.equal(events.find("魔種萌芽").when(gameState), true);
});

test("當眾拆穿、出手相救的正邪幅度照 numbers.js 的 conduct.choiceShift", () => {
  const gameState = startCultivatingLife().s;
  const shiftOf = (eventId, optionLabel) => {
    setConduct(gameState, { 善惡: 0, 正邪: 0, 穩躁: 0 });
    withSeededRandom(1, () => chooseOption(gameState, eventId, optionLabel));
    return { 善惡: gameState.tend.善惡, 正邪: gameState.tend.正邪 };
  };
  assert.deepEqual(shiftOf("市集騙子", "當眾拆穿"), { 善惡: 2, 正邪: conduct.choiceShift.當眾拆穿正邪 });
  assert.deepEqual(shiftOf("被欺凌的散修", "出手相救"), { 善惡: 6, 正邪: conduct.choiceShift.出手相救正邪 });
});

test("正邪機緣六則：各選項的作派幅度照墨淵規格，記下的因果種類正確，且不寫筆記", async () => {
  const { karmaData } = await import("../src/data/karma.js");
  // [事件, 選項, 期望的作派變化]（正邪：正＋邪－；穩躁：躁＋穩－；善惡：善＋）
  const expectations = [
    ["試劍石", "報上名號，行禮後出一劍", { 正邪: 10 }],
    ["試劍石", "站在一旁，看他們的劍路", { 穩躁: -5 }],
    ["試劍石", "不上去，繼續趕路", {}],
    ["代送一封信", "接下，照規矩送到", { 正邪: 10 }],
    ["代送一封信", "接下，路上拆開看", { 穩躁: 5 }],
    ["代送一封信", "不接", {}],
    ["坊市執事", "照坊市規矩，請兩人把靈草交給執事評斷", { 正邪: 10 }],
    ["坊市執事", "出手制住先拔法器的那個", { 正邪: 8 }],
    ["坊市執事", "自己掏靈石買下靈草，兩人各分一半", { 善惡: 5 }],
    ["無眼鶴", "收下骨牌，跟他走一趟", { 正邪: -12 }],
    ["無眼鶴", "收下骨牌，什麼都不說", { 穩躁: -5 }],
    ["無眼鶴", "把骨牌推回去", { 正邪: 5 }],
    ["血跡殘卷", "照著練", { 正邪: -12 }],
    ["血跡殘卷", "交給坊市執事", { 正邪: 8 }],
    ["血跡殘卷", "一把火燒了", { 穩躁: -5 }],
    ["截道", "動手", { 正邪: -15 }],
    ["截道", "只在遠處望風", { 正邪: -10 }],
    ["截道", "轉頭去給商隊報信", { 正邪: 10 }]
  ];
  const gameState = startCultivatingLife().s;
  for (const [eventId, optionLabel, expected] of expectations) {
    setConduct(gameState, { 善惡: 0, 正邪: 0, 穩躁: 0 });
    gameState.stones = 100; gameState.karma = []; const notesBefore = gameState.notes.length;
    withSeededRandom(3, () => chooseOption(gameState, eventId, optionLabel));
    const actual = Object.fromEntries(["善惡", "正邪", "穩躁"].map(axis => [axis, gameState.tend[axis]]).filter(([, value]) => value !== 0));
    assert.deepEqual(actual, expected, `${eventId}／${optionLabel}`);
    assert.equal(gameState.notes.length, notesBefore, `${eventId}／${optionLabel} 不該寫筆記`);
    for (const entry of gameState.karma) assert.ok(karmaData.kindById[entry.id], `${entry.id} 要在 data/karma.js 列出種類`);
  }
  // 種類：送信的分堂執事是恩、無眼鶴是欠、截道與殘卷是仇
  assert.equal(karmaData.kindById["青雲分堂執事"], "恩");
  assert.equal(karmaData.kindById["無眼鶴旁門"], "欠");
  assert.equal(karmaData.kindById["截道商隊"], "仇");
  assert.equal(karmaData.kindById["殘卷主人同門"], "仇");
  // 只在遊歷抽到；一世各一次（遇過就不再出現）
  gameState.eventsDone = [];
  for (const eventId of ["試劍石", "代送一封信", "坊市執事", "無眼鶴", "血跡殘卷", "截道"]) {
    assert.equal(events.available(gameState, "吐納").some(event => event.id === eventId), false, `${eventId} 不該在吐納出現`);
    assert.equal(events.available(gameState, "遊歷").some(event => event.id === eventId), true, `${eventId} 要在遊歷出現`);
    events.resolve(gameState, events.find(eventId), 0);
    assert.equal(events.available(gameState, "遊歷").some(event => event.id === eventId), false, `${eventId} 一世只出現一次`);
  }
  // 酬勞以「一季閉關的靈石」為單位、依境界：送信 1.5 季＝煉氣 5／築基 12／金丹 30
  const deliveryReward = realmIndex => {
    setConduct(gameState, { 正邪: 0 }); gameState.realmIndex = realmIndex; gameState.stones = 0;
    withSeededRandom(5, () => chooseOption(gameState, "代送一封信", "接下，路上拆開看"));
    return gameState.stones;
  };
  assert.deepEqual([0, 1, 2].map(deliveryReward), [5, 12, 30]);
});

test("妖獸不記因果：斬妖狼不再寫進因果帳", () => {
  const gameState = startCultivatingLife().s;
  gameState.karma = []; gameState.realmIndex = 2;   // 境界高，迎戰必勝（0.55 + 2 × 0.2 ≥ 0.95）
  withSeededRandom(1, () => chooseOption(gameState, "妖獸襲擊", "迎戰"));
  assert.equal(gameState.karma.length, 0);
});

test("正道盤查：正邪 ≤ -30 起每遊歷一季 2%，每再邪 10 點 +1%、最多 6%；已入魔或冷卻中不會出現", () => {
  const gameState = startCultivatingLife().s;
  const inspection = conduct.inspection;
  const chanceAt = righteousness => { setConduct(gameState, { 正邪: righteousness }); return routes.inspectionChancePerSeason(gameState); };
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
  gameState.flags.盤查冷卻至 = 0;
  assert.equal(chanceAt(inspection.startAt + 1), 0);
  near(chanceAt(-30), 0.02);
  near(chanceAt(-39), 0.02);
  near(chanceAt(-40), 0.03);
  near(chanceAt(-70), 0.06);
  near(chanceAt(-100), inspection.maxChancePerSeason);
  // 冷卻：平常 12 季、提早 4 季、延後 40 季
  for (const [timing, length] of [["平常", 12], ["提早", 4], ["延後", 40]]) {
    routes.setInspectionCooldown(gameState, timing);
    assert.equal(gameState.flags.盤查冷卻至 - gameState.seasons, length, timing);
    assert.equal(chanceAt(-50), 0, `${timing}冷卻中不會出現`);
    gameState.seasons += length;
    assert.ok(chanceAt(-50) > 0, `${timing}冷卻過了就會出現`);
  }
  gameState.route = "魔修";
  assert.equal(chanceAt(-80), 0, "已入魔的改由正道追殺處理");
});

test("盤查三種的選擇：一般山道照鏡；有恩時故人傳話優先；正邪 ≤ -60 執法追緝；照鏡在 -45 以下被認出轉執法", () => {
  const gameState = startCultivatingLife().s;
  gameState.karma = [];
  setConduct(gameState, { 正邪: -30 });
  assert.equal(routes.chooseInspectionVariant(gameState), "正道盤查");
  gameState.karma = [{ id: "救山道老者", text: "於山道救一老者", weight: "中", kind: "恩" }];
  assert.equal(routes.chooseInspectionVariant(gameState), "故人傳話");
  setConduct(gameState, { 正邪: conduct.inspection.pursuitAt });
  assert.equal(routes.chooseInspectionVariant(gameState), "執法追緝", "邪到 -60 以下，有恩也沒用");
  // 照鏡：-44 放行，-45 被認出、排入執法追緝
  for (const [righteousness, isRecognized] of [[-44, false], [-45, true]]) {
    setConduct(gameState, { 正邪: righteousness }); gameState.queue = [];
    chooseOption(gameState, "正道盤查", "站著讓他照");
    assert.equal(gameState.queue.some(item => item.id === "執法追緝"), isRecognized, `正邪 ${righteousness}`);
  }
  // 故人傳話：燒紙鶴會把那筆恩劃掉；請他別插手會讓下一次行動遇上照鏡
  gameState.karma = [{ id: "救山道老者", text: "於山道救一老者", weight: "中", kind: "恩" }];
  gameState.flags.傳話恩 = "救山道老者";
  assert.match(events.text(gameState, events.find("故人傳話")), /於山道救一老者/);
  chooseOption(gameState, "故人傳話", "請他別再插手");
  assert.equal(gameState.flags.盤查下季, true);
  chooseOption(gameState, "故人傳話", "把紙鶴燒了");
  assert.equal(gameState.karma[0].done, true);
});

test("盤查選項的顯示條件：香火錢要付得起 3 季閉關靈石", () => {
  const gameState = startCultivatingLife().s;
  const labels = () => events.choices(gameState, events.find("正道盤查")).map(option => option.label);
  const price = routes.seasonStones(gameState, conduct.inspection.bribeSeasons);
  gameState.stones = price - 1;
  assert.ok(!labels().includes("遞上一袋靈石，說是香火錢"));
  gameState.stones = price;
  assert.ok(labels().includes("遞上一袋靈石，說是香火錢"));
  chooseOption(gameState, "正道盤查", "遞上一袋靈石，說是香火錢");
  assert.equal(gameState.stones, 0);
});

test("鬥法與遁走：d20／d12 門檻換算成機率", () => {
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} ≠ ${expected}`);
  near(routes.duelWinChance("一人", false), (21 - 5) / 20);    // 0.80
  near(routes.duelWinChance("一人", true), (21 - 13) / 20);    // 0.40
  near(routes.duelWinChance("幫手", false), (21 - 8) / 20);    // 0.65
  near(routes.duelWinChance("幫手", true), (21 - 16) / 20);    // 0.25
  near(routes.duelWinChance("高手", false), (21 - 10) / 20);   // 0.55
  near(routes.duelWinChance("高手", true), (21 - 18) / 20);    // 0.15
  near(routes.duelSurviveChance(false), (13 - 4) / 12);        // 0.75
  near(routes.duelSurviveChance(true), (13 - 6) / 12);         // 0.583…
  // 擲 1 必敗：勝率上限 0.95
  const original = conduct.duel.winThreshold.一人.healthy;
  conduct.duel.winThreshold.一人.healthy = 0;
  try { assert.equal(routes.duelWinChance("一人", false), conduct.duel.maxWinChance); }
  finally { conduct.duel.winThreshold.一人.healthy = original; }
  near(routes.fleeChance(false), conduct.duel.fleeChance);
  near(routes.fleeChance(true), conduct.duel.fleeChance - conduct.duel.fleeHelperPenalty);
});

test("仇家：賠罪只限中因果且付得起；斬草除根了結舊仇、他的同門記一筆新的中因果・仇", () => {
  const gameState = startCultivatingLife().s;
  const labels = () => events.choices(gameState, events.find("仇家尋仇")).map(option => option.label);
  gameState.karma = [{ id: "搶散修靈草", text: "趁亂搶走受欺凌散修的靈草", weight: "中", kind: "仇" },
                     { id: "大仇", text: "一樁大仇", weight: "大", kind: "仇" }];
  const price = Math.max(routes.seasonStones(gameState, conduct.enemy.apologyMinSeasons), Math.ceil(1000 * conduct.enemy.apologyStoneShare));
  gameState.stones = 1000;
  gameState.flags.仇家目標 = "大仇";
  assert.ok(!labels().includes("賠罪了結"), "大因果不能賠罪");
  gameState.flags.仇家目標 = "搶散修靈草";
  assert.ok(labels().includes("賠罪了結"));
  gameState.stones = 10;
  assert.ok(!labels().includes("賠罪了結"), "付不起就不顯示");
  gameState.stones = 1000;
  chooseOption(gameState, "仇家尋仇", "賠罪了結");
  assert.equal(gameState.stones, 1000 - price);
  assert.equal(gameState.karma.find(entry => entry.id === "搶散修靈草").done, true);
  // 斬草除根
  gameState.flags.仇家目標 = "大仇";
  chooseOption(gameState, "仇家勝後", "斬草除根");
  assert.equal(gameState.karma.find(entry => entry.id === "大仇").done, true);
  const newGrudge = gameState.karma.find(entry => entry.id === "大仇的同門");
  assert.ok(newGrudge, "要多一筆同門的仇");
  assert.deepEqual([newGrudge.weight, newGrudge.kind, newGrudge.done], ["中", "仇", false]);
});

test("執法追緝只做紀錄的那頁筆記不佔名額、不在可勾選清單", async () => {
  const { save } = await import("../src/systems/save.js");
  const game = startCultivatingLife();
  const gameState = game.s;
  gameState.flags.執法陣仗 = "一人"; setConduct(gameState, { 正邪: -70 });
  withSeededRandom(2, () => chooseOption(gameState, "執法追緝", "束手就擒"));
  const recordIndex = gameState.notes.findIndex(note => note.kind === "紀錄");
  assert.ok(recordIndex >= 0);
  assert.equal(gameState.notes[recordIndex].text, "曾被青雲門執法堂追緝");
  assert.equal(legacy.isUnpickableNote(gameState.notes[recordIndex]), true);
  legacy.die(gameState, "坐化");
  game.ui.picks = [recordIndex]; game.bequeath();
  assert.equal((save.loadLegacy().pending || []).length, 0, "硬勾紀錄頁也不會被當成筆記傳下去");
});

test("線索句：穩躁 ≤ keenSenseTemperAtMost（偏穩）才看得清，和心魔無關", () => {
  const gameState = startCultivatingLife().s;
  const threshold = conduct.keenSenseTemperAtMost;
  const textOf = eventId => events.text(gameState, events.find(eventId));
  gameState.demon = 0;
  // 仇家：中因果一人的線索句
  gameState.karma = [{ id: "搶散修靈草", text: "趁亂搶走受欺凌散修的靈草", weight: "中", kind: "仇" }];
  gameState.flags.仇家目標 = "搶散修靈草";
  setConduct(gameState, { 穩躁: threshold + 1 });
  assert.doesNotMatch(textOf("仇家尋仇"), /握刀的手在抖/, "心魔再低，不夠穩也看不清");
  setConduct(gameState, { 穩躁: threshold });
  assert.match(textOf("仇家尋仇"), /握刀的手在抖/);
  // 執法追緝：多人有高手時，高手那句也照同一個條件
  gameState.flags.執法陣仗 = "多人有高手";
  assert.match(textOf("執法追緝"), /其中一道很輕/);
  setConduct(gameState, { 穩躁: threshold + 1 }); gameState.demon = 100;
  assert.doesNotMatch(textOf("執法追緝"), /其中一道很輕/);
  assert.match(textOf("執法追緝"), /三四道呼吸/, "一人／多人的線索不需要看得清");
});

test("衡天定案：編來歷 -30～-44 成功 50%、-45 以下 30%；執法陣仗一套 50／35／15，不依正邪分段", () => {
  const gameState = startCultivatingLife().s;
  const passAt = righteousness => { setConduct(gameState, { 正邪: righteousness }); return routes.storyPassChance(gameState); };
  assert.equal(passAt(-30), 0.5);
  assert.equal(passAt(-44), 0.5);
  assert.equal(passAt(-45), 0.3);
  assert.equal(passAt(-90), 0.3);
  const squadAt = righteousness => { setConduct(gameState, { 正邪: righteousness }); return routes.lawSquadChance(gameState); };
  for (const righteousness of [-45, -60, -80, -100]) {
    assert.deepEqual(squadAt(righteousness), { 一人: 0.5, 多人: 0.35, 多人有高手: 0.15 }, `正邪 ${righteousness}`);
  }
});

test("作派筆記描述（墨淵定稿）：各軸過門檻才算偏向，三軸都持平時世人不太記得你", () => {
  const gameState = startCultivatingLife().s;
  const describe = values => { setConduct(gameState, values); return routes.describeConductAtDeath(gameState); };
  // 墨淵的例句（善惡 25、穩躁 40 含等號就算偏向）
  assert.equal(describe({ 善惡: 25, 正邪: 0, 穩躁: 40 }),
    "這一世，世人記得你待人寬厚，受過你恩的人不少，沒有投進哪一道，做事急，常常先出手再想。");
  // 另一端：惡、正、穩
  assert.equal(describe({ 善惡: -25, 正邪: 41, 穩躁: -40 }),
    "這一世，世人記得你下手不留情，記恨你的人不少，走的是正路，山門裡有人叫得出你的名字，做事慢，每一步都踩實了。");
  // 正邪是嚴格大於／小於：正好 40、正好 -30 都算持平；41、-31 才算偏向
  const describeRighteousness = value => describe({ 善惡: 25, 正邪: value, 穩躁: 0 });
  assert.ok(describeRighteousness(40).includes("沒有投進哪一道"));
  assert.ok(describeRighteousness(41).includes("走的是正路"));
  assert.ok(describeRighteousness(-30).includes("沒有投進哪一道"));
  assert.ok(describeRighteousness(-31).includes("走的是偏路"));
  // 三軸都持平（差一點到門檻也算持平）
  assert.equal(describe({ 善惡: 24, 正邪: 40, 穩躁: 39 }), "這一世，世人不太記得你。");
  assert.equal(describe({ 善惡: -24, 正邪: -30, 穩躁: -39 }), "這一世，世人不太記得你。");
  assert.equal(describe({ 善惡: 0, 正邪: 0, 穩躁: 0 }), "這一世，世人不太記得你。");
});
