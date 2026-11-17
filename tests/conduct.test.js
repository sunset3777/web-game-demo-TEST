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

test("新的一世三軸都從 0 開始；舊存檔沒有善惡時補 0", () => {
  const gameState = startCultivatingLife().s;
  assert.deepEqual([gameState.tend.善惡, gameState.tend.正邪, gameState.tend.穩躁], [0, 0, 0]);
  delete gameState.tend.善惡;
  assert.equal(routes.view(gameState).善惡, 0);
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

test("正道盤查：正邪 ≤ -30 才出現、越邪權重越高，已入魔的不會遇到", () => {
  const gameState = startCultivatingLife().s;
  const isInspectionAvailable = () => events.available(gameState, "遊歷").some(event => event.id === "正道盤查");
  setConduct(gameState, { 正邪: conduct.inspection.startAt + 1 });
  assert.equal(isInspectionAvailable(), false);
  assert.equal(routes.inspectionWeight(gameState), 0);
  setConduct(gameState, { 正邪: conduct.inspection.startAt });
  assert.equal(isInspectionAvailable(), true);
  const weightAtThreshold = routes.inspectionWeight(gameState);
  setConduct(gameState, { 正邪: -100 });
  assert.ok(routes.inspectionWeight(gameState) > weightAtThreshold, "越邪權重要越高");
  assert.equal(routes.inspectionWeight(gameState), conduct.inspection.baseWeight + (conduct.inspection.startAt + 100) * conduct.inspection.weightPerPoint);
  gameState.route = "魔修";
  assert.equal(isInspectionAvailable(), false);
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

test("仇家迎戰得勝會了結最早一筆中、大因果", () => {
  const gameState = startCultivatingLife().s;
  gameState.karma = [{ id: "小事", text: "小事", weight: "小" }, { id: "搶散修靈草", text: "搶靈草", weight: "中" }];
  const originalChance = conduct.enemy.fightWinChance;
  conduct.enemy.fightWinChance = 1;   // 只測「得勝時了結因果」這件事
  try { chooseOption(gameState, "仇家尋仇", "迎戰"); } finally { conduct.enemy.fightWinChance = originalChance; }
  assert.equal(gameState.karma.find(entry => entry.id === "搶散修靈草").done, true);
  assert.notEqual(gameState.karma.find(entry => entry.id === "小事").done, true);
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
  setConduct(game.s, { 善惡: 30, 正邪: -40, 穩躁: 10 });
  legacy.die(game.s, "坐化");
  const conductNote = game.s.notes.find(note => note.kind === "作派");
  assert.ok(conductNote, "要有一頁作派筆記");
  assert.deepEqual(conductNote.conduct, { 善惡: 30, 正邪: -40, 穩躁: 10 });
  assert.match(conductNote.text, /待人寬厚/);
  assert.match(conductNote.text, /旁門左道/);
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
