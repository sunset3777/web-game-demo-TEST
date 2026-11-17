// 路線與傾向系統：記錄行事與心性傾向、提供各路線對數值的修正、切換路線、稱號
import { numbers } from "../data/numbers.js";
import { routesData } from "../data/routes.js";
import { karmaData } from "../data/karma.js";

const R = routesData;

export const routes = {
  // 舊存檔沒有這些欄位時補上
  ensure(s) {
    if (!s.tend) s.tend = { act: { 吐納: 0, 周天: 0, 閉關: 0, 遊歷: 0 }, 善惡: 0, 正邪: 0, 穩躁: 0 };
    // 作派第三軸（2026-11-17 加入）：舊存檔沒有善惡，從 0 開始
    if (s.tend.善惡 === undefined) s.tend.善惡 = 0;
    if (!s.route) s.route = "氣修";
    if (!s.recentEvents) s.recentEvents = [];
    return s;
  },

  def(s) { this.ensure(s); return R.routes[s.route] || R.routes["氣修"]; },
  mod(s, key, dflt) { const m = this.def(s).mods[key]; return m === undefined ? dflt : m; },

  // ---- 傾向 ----
  clamp(v) { return Math.max(-R.tendency.clamp, Math.min(R.tendency.clamp, v)); },
  onAction(s, action) {
    this.ensure(s);
    const T = s.tend;
    Object.keys(T.act).forEach(k => { T.act[k] *= R.tendency.decay; });
    T.act[action] = (T.act[action] || 0) + 1;
    T.穩躁 = this.applyActionStepToTemper(T.穩躁, (R.tendency.actStep[action] || 0) * numbers.conduct.actionStepScale);
  },
  // 修練行動只能把穩躁推到 ±actionStepLimit；已經超過的（事件推出去的）不會被行動拉回，也不會再被推遠
  applyActionStepToTemper(currentTemper, step) {
    const limit = numbers.conduct.actionStepLimit;
    if (step > 0) return currentTemper >= limit ? currentTemper : Math.min(limit, currentTemper + step);
    if (step < 0) return currentTemper <= -limit ? currentTemper : Math.max(-limit, currentTemper + step);
    return currentTemper;
  },
  adjust(s, axis, delta) { this.ensure(s); s.tend[axis] = this.clamp((s.tend[axis] || 0) + delta); },
  habit(s) {
    this.ensure(s);
    const [k, v] = Object.entries(s.tend.act).sort((a, b) => b[1] - a[1])[0];
    return v >= R.tendency.dominant ? k : null;
  },
  view(s) { this.ensure(s); return { 善惡: s.tend.善惡, 正邪: s.tend.正邪, 穩躁: s.tend.穩躁, habit: this.habit(s), act: s.tend.act }; },

  // ---- 作派帶出的事件機率 ----
  // 正道盤查：每遊歷一季的機率。還沒邪到門檻、已經入魔（改由正道追殺處理）、或還在冷卻中都是 0
  inspectionChancePerSeason(gameState) {
    const inspection = numbers.conduct.inspection, righteousness = this.view(gameState).正邪;
    if (righteousness > inspection.startAt || gameState.route === "魔修") return 0;
    if (gameState.seasons < (gameState.flags.盤查冷卻至 || 0)) return 0;
    const extraSteps = Math.floor((inspection.startAt - righteousness) / 10);
    return Math.min(inspection.maxChancePerSeason, inspection.baseChancePerSeason + extraSteps * inspection.extraChancePer10);
  },
  // 盤查出現後的冷卻：平常／提早／延後（選項可以改寫）
  setInspectionCooldown(gameState, timing = "平常") {
    const inspection = numbers.conduct.inspection;
    const length = { 平常: inspection.cooldownSeasons, 提早: inspection.earlyCooldownSeasons, 延後: inspection.lateCooldownSeasons }[timing];
    gameState.flags.盤查冷卻至 = gameState.seasons + length;
  },
  // 這次盤查是哪一種：正邪 ≤ pursuitAt 直接執法追緝；因果帳有「恩」時故人傳話優先；其餘山道照鏡
  chooseInspectionVariant(gameState) {
    if (this.view(gameState).正邪 <= numbers.conduct.inspection.pursuitAt) return "執法追緝";
    return this.oldestOpenKarma(gameState, "恩") ? "故人傳話" : "正道盤查";
  },
  // 最早一筆還沒了結、也還沒淡去的某類因果（可限定輕重）
  oldestOpenKarma(gameState, kind, weights) {
    const kindOf = entry => entry.kind || karmaData.kindById[entry.id] || karmaData.defaultKind;
    return (gameState.karma || []).find(entry => !entry.done && !entry.faded && kindOf(entry) === kind && (!weights || weights.includes(entry.weight))) || null;
  },

  // ---- 鬥法與遁走（d20／d12 換算成機率，數字在 numbers.js 的 conduct.duel） ----
  duelWinChance(opponent, isInjured) {
    const duel = numbers.conduct.duel, threshold = duel.winThreshold[opponent][isInjured ? "injured" : "healthy"];
    return Math.min(duel.maxWinChance, (21 - threshold) / 20);
  },
  duelSurviveChance(isInjured) {
    const duel = numbers.conduct.duel;
    return (13 - duel.surviveThreshold[isInjured ? "injured" : "healthy"]) / 12;
  },
  fleeChance(hasHelpers) {
    const duel = numbers.conduct.duel;
    return duel.fleeChance - (hasHelpers ? duel.fleeHelperPenalty : 0);
  },
  // 線索句只給「神識高」的人看；repo 沒有神識數值，暫以心魔低代替（未驗證是否為最終設計）
  hasKeenSense(gameState) { return gameState.demon < numbers.conduct.keenSenseDemonBelow; },
  // 「幾季閉關的靈石」依境界換算（四捨五入）
  seasonStones(gameState, seasons) {
    const cost = numbers.risk.閉關.cost;
    return Math.round(cost[Math.min(gameState.realmIndex, cost.length - 1)] * seasons);
  },
  // 這次行動有仇家找上門的機率：只算還沒了結、也還沒淡去的「仇」類中、大因果（行善結下的「恩」不會招來仇家）。
  // 偏惡（善惡 ≤ evilAt）的人先乘 evilMultiplier，再用比較高的上限封頂（11/17 玄機定：先加乘再封頂）
  enemyChance(gameState) {
    const enemy = numbers.conduct.enemy;
    const kindOf = entry => entry.kind || karmaData.kindById[entry.id] || karmaData.defaultKind;
    const openGrudges = (gameState.karma || []).filter(entry => !entry.done && !entry.faded && kindOf(entry) === "仇");
    const baseChance = openGrudges.reduce((sum, entry) => sum + (enemy.chancePerKarma[entry.weight] || 0), 0);
    const isEvil = this.view(gameState).善惡 <= enemy.evilAt;
    return isEvil ? Math.min(enemy.evilChanceCap, baseChance * enemy.evilMultiplier) : Math.min(enemy.chanceCap, baseChance);
  },

  // 一世結束時寫進筆記的作派描述（文字為佔位，TODO(墨淵)：換成正式文案）
  describeConductAtDeath(gameState) {
    const conduct = this.view(gameState);
    const describeAt = numbers.conduct.describeAt;
    const pick = (value, high, low, middle) => value >= describeAt ? high : value <= -describeAt ? low : middle;
    return `這一世，世人記得你${pick(conduct.善惡, "待人寬厚", "待人刻薄", "待人尋常")}、`
      + `${pick(conduct.正邪, "行事端正", "走的是旁門左道", "不偏不倚")}、`
      + `${pick(conduct.穩躁, "性子急躁", "性子沉穩", "不急不徐")}。`;
  },

  // ---- 稱號（人稱「…」）----
  title(s) {
    const t = this.view(s);
    const hit = R.titles.find(x => (!x.route || x.route === s.route) && (!x.when || x.when(t)));
    return hit ? hit.title : s.mark;
  },

  // ---- 數值修正 ----
  cultMult(s, action) {
    const ac = this.mod(s, "actionCult", {});
    const dc = this.mod(s, "demonToCult", 0);
    return this.mod(s, "cult", 1) * (ac[action] || 1) * (1 + dc * s.demon);
  },
  // 用來算懲罰的「有效心魔」：魔修在 demonFloor 以下不受心魔影響
  demonEff(s) { const f = this.mod(s, "demonFloor", 0); return Math.max(0, s.demon - f); },
  rootMult(s, raw) { const w = this.mod(s, "rootWeight", 1); return 1 + (raw - 1) * w; },
  lifeMult(s) { return this.mod(s, "life", 1); },
  injuryMult(s) { return this.mod(s, "injury", 1); },
  deathMult(s) { return this.mod(s, "deathIfInjured", 1); },
  tagBias(s, tag) {
    const b = this.mod(s, "tagBias", {});
    if (R.routeTags.includes(tag)) return b[tag] || 0;   // 路線專屬系別，別的路線抽不到
    return b[tag] || 1;
  },

  // ---- 切換路線 ----
  setRoute(s, id, techniques) {
    const d = R.routes[id];
    if (!d || s.route === id) return;
    s.route = id;
    if (d.technique) {
      if (!s.techniques.includes(d.technique)) s.techniques.push(d.technique);
      s.technique = d.technique;
    }
  }
};
