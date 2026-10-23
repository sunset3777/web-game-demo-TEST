// 遊歷系統：遊歷途中每季的遇險（強敵、妖獸／劫修、被劫）、趕上秘境的收穫、沿途撿到的靈石與材料
// 實作計畫階段 2 的共用判定（contest.js）與遇險事件，會從這裡的遇險檢查接手。
import { numbers } from "../data/numbers.js";
import { layoutData } from "../data/layout.js";
import { util, state } from "./state.js";
import { legacy } from "./legacy.js";
import { world } from "./world.js";
// 互相匯入：cultivation.run() 呼叫這裡，這裡借用 cultivation 的 mishap／checkStages。
// 兩邊都只在函式執行時才用到對方，模組載入順序不影響。
import { cultivation } from "./cultivation.js";

export const travel = {
  // 遊歷的一季（由 cultivation.run() 在每季修練之後呼叫）。
  // bonuses、injuryMultiplier 沿用 run() 開頭算好的值。
  // 回傳 { died, xiuGained, insightGained }：died＝這一季身死，run() 要結束這次行動
  runTravelSeason(s, out, bonuses, injuryMultiplier) {
    const N = numbers, st = state, U = util, R = N.risk, b = bonuses, injMul = injuryMultiplier;
    let xiuGained = 0, insightGained = 0;
    const dl = R.遊歷.deadly[Math.min(s.realmIndex, R.遊歷.deadly.length - 1)];
    if (U.chance(dl)) { out.push("你在山中撞見一頭氣息遠勝於你的妖王。你甚至來不及轉身。"); legacy.die(s, "遇劫身死"); return { died: true, xiuGained, insightGained }; }
    if (U.chance(R.遊歷.mishap * b.injury * injMul) && cultivation.mishap(s, out, "途中遇上妖獸，你拼死脫身，受了傷。", "途中遇上劫修。你本就帶傷，沒能逃掉。", "遇劫身死")) { return { died: true, xiuGained, insightGained }; }
    if (world.secretOpen(s) && s.secretTaken !== s.secretAt) {
      const S = N.secret, ri = Math.min(s.realmIndex, 2);
      s.secretTaken = s.secretAt;
      if (st.inBottleneck(s)) { s.insight += S.insight[ri]; insightGained += S.insight[ri]; }
      else { s.xiu += S.xiu[ri]; xiuGained += S.xiu[ri]; cultivation.checkStages(s, out); }
      const mats = Object.keys(layoutData.materials);
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
    const common = Object.keys(layoutData.materials).filter(m => !["雷擊木", "古劍殘片", "玄水青蓮"].includes(m));
    for (let i = 0; i < seasonsTraveled; i++) {
      stones += util.rand(numbers.travel.stonesMin, numbers.travel.stonesMax);
      if (util.chance(numbers.travel.materialChance + b.material)) mats.push(util.pick(common));
    }
    s.stones += stones;
    mats.forEach(m => { s.materials[m] = (s.materials[m] || 0) + 1; });
    return `沿途得靈石 ${stones}${mats.length ? "，採得" + mats.join("、") : ""}。`;
  }
};
