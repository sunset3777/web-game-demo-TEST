// 遊歷系統：遊歷途中每季的遇險（強敵、妖獸／劫修、被劫）、趕上秘境的收穫、沿途撿到的靈石與材料
// 實作計畫階段 2 的共用判定（contest.js）與遇險事件，會從這裡的遇險檢查接手。
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { eventsData } from "../data/events.js";
import { util, state } from "./state.js";
import { world } from "./world.js";
import { legacy } from "./legacy.js";
import { routes } from "./routes.js";
// 互相匯入：cultivation.run() 呼叫這裡，這裡借用 cultivation 的 mishap／checkStages。
// 兩邊都只在函式執行時才用到對方，模組載入順序不影響。
import { cultivation } from "./cultivation.js";

export const travel = {
  // 遊歷的一季（由 cultivation.run() 在每季修練之後呼叫）。
  // bonuses、injuryMultiplier 沿用 run() 開頭算好的值。
  // 回傳 { died, hasSensedDemonKing, xiuGained, insightGained }：
  //   died＝這一季身死；hasSensedDemonKing＝察覺妖王，這次遊歷就此打住。兩者 run() 都要結束這次行動
  runTravelSeason(s, out, bonuses, injuryMultiplier) {
    const N = numbers, st = state, U = util, R = N.risk, b = bonuses, injMul = injuryMultiplier;
    let xiuGained = 0, insightGained = 0;
    const dl = R.遊歷.deadly[Math.min(s.realmIndex, R.遊歷.deadly.length - 1)];
    // 撞見妖王（11/08 定）：不再一擲骰就身死。先排入「妖王徵兆」事件，讓玩家讀懂危險、選擇遁走或冒險一探；
    // 這一季的其他遇險、秘境、被劫都不再判定，免得玩家還沒做選擇就又出事
    if (U.chance(dl)) {
      out.push("走到半途，你察覺山林裡有些不對勁。");
      s.queue.push({ type: "event", id: "妖王徵兆" });
      return { died: false, hasSensedDemonKing: true, xiuGained, insightGained };
    }
    if (U.chance(R.遊歷.mishap * b.injury * injMul) && cultivation.mishap(s, out, "途中遇上妖獸，你拼死脫身，受了傷。", "途中遇上劫修。你本就帶傷，沒能逃掉。", "遇劫身死")) { return { died: true, xiuGained, insightGained }; }
    if (world.secretOpen(s) && s.secretTaken !== s.secretAt) {
      const S = N.secret, ri = Math.min(s.realmIndex, 2);
      s.secretTaken = s.secretAt;
      if (st.inBottleneck(s)) { s.insight += S.insight[ri]; insightGained += S.insight[ri]; }
      else { s.xiu += S.xiu[ri]; xiuGained += S.xiu[ri]; cultivation.checkStages(s, out); }
      const mats = Object.keys(layoutData.materials).filter(m => !layoutData.eventOnlyMaterials.includes(m));
      let mat = null; if (U.chance(S.material)) { mat = U.pick(mats); s.materials[mat] = (s.materials[mat] || 0) + 1; }
      out.push(`你趕上了秘境開啟，在裡頭闖了一遭，收穫頗豐${mat ? `，還帶出一份${mat}` : ""}。`);
    }
    if (U.chance(R.遊歷.robbery) && s.stones > 0) { const lost = Math.ceil(s.stones / 2); s.stones -= lost; out.push(`途中遭人暗算，被搶走了 ${lost} 塊靈石。`); }
    return { died: false, xiuGained, insightGained };
  },

  // 遊歷結束後結算沿途所得（原本寫在 controller.doAction()）；回傳要顯示的一行文字
  collectRoadsideLoot(s, seasonsTraveled) {
    const b = state.bonuses(s);
    let stones = 0; const mats = [];
    const common = Object.keys(layoutData.materials).filter(m => !["雷擊木", "古劍殘片", "玄水青蓮"].includes(m) && !layoutData.eventOnlyMaterials.includes(m));
    for (let i = 0; i < seasonsTraveled; i++) {
      stones += util.rand(numbers.travel.stonesMin, numbers.travel.stonesMax);
      if (util.chance(numbers.travel.materialChance + b.material)) mats.push(util.pick(common));
    }
    s.stones += stones;
    mats.forEach(m => { s.materials[m] = (s.materials[m] || 0) + 1; });
    return `沿途得靈石 ${stones}${mats.length ? "，採得" + mats.join("、") : ""}。`;
  },

  // ---- 妖王：冒險一探與線索（11/13 會議定） ----
  // 線索存在遊戲狀態的 demonKingClues（本世拿到的）與 inheritedDemonKingClues（前人筆記帶來的，含效力權重）。
  // 舊存檔沒有這兩個欄位，一律當成空的

  // 算得上的線索條數：本世每條算 1，前人的照隔幾世打折，合計最多算 cluesCountedMax 條。
  // 同一種線索（習性、弱點、出沒季節）不管記了幾次只算一次，取效力最強的那份，
  // 免得前人筆記和本世重複記下的同一件事被算成兩條
  countDemonKingClues(gameState) {
    const K = numbers.risk.遊歷.demonKing;
    const strongestWeightByType = {};
    const keepStrongest = (type, weight) => { strongestWeightByType[type] = Math.max(strongestWeightByType[type] || 0, weight); };
    (gameState.inheritedDemonKingClues || []).forEach(clue => keepStrongest(clue.type, clue.weight));
    (gameState.demonKingClues || []).forEach(clue => keepStrongest(clue.type, 1));
    const total = Object.values(strongestWeightByType).reduce((sum, weight) => sum + weight, 0);
    return Math.min(K.cluesCountedMax, total);
  },

  // 遁走受傷（帶傷時是遁走失敗）的機率：每條線索扣一些，但不低於下限；原本就低於下限的不動
  demonKingFleeHurtChance(gameState, baseChance) {
    const K = numbers.risk.遊歷.demonKing;
    const reduced = baseChance - K.clueFleeHurtCut * this.countDemonKingClues(gameState);
    return Math.max(Math.min(baseChance, K.clueFleeHurtFloor), reduced);
  },

  // 冒險一探：擲一次決定成功／重傷／身死。身死機率先乘路線修正、再扣線索（有下限），扣掉的機率算進重傷。
  // treatAsHealthy：「照筆記避開」還是撞上時，照沒帶傷的機率算
  probeDemonKing(gameState, { treatAsHealthy = false } = {}) {
    const K = numbers.risk.遊歷.demonKing;
    const isInjured = gameState.injury > 0 && !treatAsHealthy;
    const odds = isInjured ? K.probeIfInjured : K.probeIfHealthy;
    const routeDeathChance = odds.death * routes.deathMult(gameState);
    const deathChance = Math.max(Math.min(routeDeathChance, K.clueDeathFloor), routeDeathChance - K.clueDeathCut * this.countDemonKingClues(gameState));
    const roll = Math.random();
    if (roll < deathChance) {
      legacy.die(gameState, "遇劫身死");
      return isInjured
        ? "你本就帶傷，還是硬闖了過去。林子深處盤著一頭妖王，你甚至來不及轉身。"
        : "你循著妖氣摸了過去。林子深處盤著一頭妖王，牠睜眼的那一刻，你就知道自己走不掉了。";
    }
    if (roll < deathChance + odds.success) return this.rewardDemonKingProbe(gameState);
    gameState.injury = K.heavyInjurySeasons;
    return "你循著妖氣摸了過去。林子深處盤著一頭妖王，牠只睜了睜眼，你便被一股巨力掀飛。你拼死脫身，傷得不輕。\n〔重傷〕";
  },

  // 一探成功的回報：感悟；這一世前兩次成功還會記下一條線索（不重複），並有機會撿到妖丹
  rewardDemonKingProbe(gameState) {
    const K = numbers.risk.遊歷.demonKing;
    const lines = ["你屏住氣息，伏在下風處遠遠看了牠大半天，直到牠起身離去。"];
    if (state.inBottleneck(gameState)) gameState.insight += K.probeSuccessInsight; else gameState.insightBank += K.probeSuccessInsight;
    const ownClues = gameState.demonKingClues || (gameState.demonKingClues = []);
    if (ownClues.length < K.cluesPerLifeMax) {
      const unknownTypes = Object.keys(eventsData.demonKingClues).filter(type => !ownClues.some(clue => clue.type === type));
      const type = util.pick(unknownTypes);
      const text = eventsData.demonKingClues[type];
      ownClues.push({ type, text });
      state.note(gameState, `妖王線索（${type}）：${text}`, "妖王線索");
      lines.push(`你把看到的記進了筆記：${text}`);
      if (util.chance(K.demonPillChance)) {
        gameState.materials["妖丹"] = (gameState.materials["妖丹"] || 0) + 1;
        lines.push("牠臥過的地方，留著一顆吐出的妖丹。你小心收了起來。");
      }
    } else {
      lines.push("牠的習性你早已摸清，這一趟只是又多了幾分體會。");
    }
    lines.push(`〔感悟 +${K.probeSuccessInsight}〕`);
    return lines.join("\n");
  }
};
