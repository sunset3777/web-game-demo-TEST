// 修練系統：季節推進、長短行動、修為與小境界、瓶頸感悟、受傷、壽元
import { numbers } from "../data/numbers.js";
import { util, state } from "./state.js";
import { events } from "./events.js";
import { legacy } from "./legacy.js";

export const cultivation = {
  // 行動一次耗時（季）
  length(s, action) {
    const A = numbers.actions[action];
    return A.long ? state.realm(s).longLen : 1;
  },

  // 每季修為
  xiuPerSeason(s, action) {
    const N = numbers, st = state, A = N.actions[action];
    const b = st.bonuses(s);
    const season = st.season(s);
    let m = st.realm(s).perSeason * st.rootMult(s) * A.mult * (1 + b.cult);
    if (action === "閉關") m *= N.seasonMult[season].seclude * (1 + b.seclude);
    else m *= N.seasonMult[season].cult;
    if (s.injury > 0) m *= 0.5;
    return m;
  },

  insightPerSeason(s, action) {
    const b = state.bonuses(s);
    return numbers.actions[action].insight * (1 + b.insight);
  },

  // 執行行動。full＝修滿整段；回傳結果文字陣列
  run(s, action, full) {
    const N = numbers, st = state, U = util, A = N.actions[action];
    const L = this.length(s, action);
    const n = full ? L : 1;
    const b = st.bonuses(s);
    const out = [];
    let gained = 0, insightGained = 0, done = 0, interrupted = false;

    for (let i = 0; i < n; i++) {
      if (A.interrupt && i > 0 && U.chance(A.interrupt / Math.max(1, L - 1))) { interrupted = true; break; }
      const wasBottleneck = st.inBottleneck(s);
      if (wasBottleneck) {
        const g = this.insightPerSeason(s, action);
        s.insight += g; insightGained += g;
      } else if (!s.demoEnd) {
        let g = this.xiuPerSeason(s, action);
        if (full && L > 1) g *= N.fullSegmentBonus;
        s.xiu += g; gained += g;
        this.checkStages(s, out);
      }
      // 心魔
      let d = A.demon;
      if (d > 0) d *= b.demonGain;
      s.demon = Math.max(0, Math.min(N.demon.max, s.demon + d));
      // 受傷
      if (s.injury > 0) s.injury--;
      if (A.injury && U.chance(A.injury * b.injury)) { s.injury = N.injurySeasons; out.push("修練時岔了氣，受了傷（兩季內修為減半）。"); }
      done++;
      if (this.advanceSeason(s, out)) break;  // 壽盡
    }

    const head = `${action}${done > 1 ? `了 ${done} 季` : "一季"}`;
    const parts = [];
    if (gained > 0) parts.push(`修為 +${Math.round(gained)}`);
    if (insightGained > 0) parts.push(`感悟 +${Math.round(insightGained)}`);
    if (interrupted) out.unshift("閉關途中被外事驚擾，只得提前出關。");
    out.unshift(head + (parts.length ? `：${parts.join("，")}` : "。"));
    if (st.inBottleneck(s) && gained > 0) out.push(`修為已至${st.stageName(s)}的極限，觸到了瓶頸。之後的修練將累積感悟。`);
    s.turns++;
    return { lines: out, seasons: done, eventChance: 1 - Math.pow(1 - Math.min(0.95, A.event + b.event), Math.max(1, done)) };
  },

  // 修為滿了就嘗試突破小境界；大境界最後一層停在瓶頸
  checkStages(s, out) {
    const N = numbers, st = state, U = util;
    while (s.xiu >= st.stageReq(s)) {
      if (st.isLastStage(s)) {
        if (!st.realm(s).major) {
          if (!s.demoEnd) { s.demoEnd = true; out.push("你已修至金丹圓滿，這是 demo 的終點。可以繼續度過餘生，或選擇坐化。"); st.note(s, "修至金丹圓滿。", "里程碑"); }
          s.xiu = st.stageReq(s);
        }
        if (st.realm(s).major) {
          if (s.insightBank > 0) { s.insight += s.insightBank; out.push(`前人心得在此刻派上用場（感悟 +${s.insightBank}）。`); s.insightBank = 0; }
          s.xiu = st.stageReq(s);
        }
        return;
      }
      const rate = Math.max(0.05, N.smallStageRate - Math.min(s.demon, N.demon.gate) * N.demon.penalty - Math.max(0, s.demon - N.demon.gate) * N.demon.forcePenalty);
      if (U.chance(rate)) {
        s.xiu -= st.stageReq(s);
        s.stageIndex++;
        out.push(`突破至${st.stageName(s)}。`);
        s.queue.push({ type: "growth" });
      } else {
        const loss = st.stageReq(s) * N.smallStageLoss;
        s.xiu = Math.max(0, s.xiu - loss);
        out.push(`衝擊${st.realm(s).stages[s.stageIndex + 1]}失敗，修為倒退 ${Math.round(loss)}。`);
        return;
      }
    }
  },

  // 推進一季；壽盡時回傳 true
  advanceSeason(s, out) {
    const st = state;
    s.seasonIdx = (s.seasonIdx + 1) % 4;
    s.seasons++;
    events.fadeKarma(s);
    if (st.age(s) >= st.maxAge(s)) {
      legacy.die(s, "壽盡");
      out.push(`${Math.floor(st.age(s))} 歲，壽元耗盡，你在${st.stageName(s)}坐化。`);
      return true;
    }
    return false;
  },

  // 坊市價格（小行動，不佔回合）
  price(s, item) {
    const M = numbers.market;
    const base = M.prices[item];
    const cat = M.category[item];
    return Math.round(base * (M.seasonMult[cat] ? M.seasonMult[cat][s.seasonIdx] : 1));
  },
  buy(s, item) {
    const p = this.price(s, item);
    if (s.stones < p) return `靈石不足（需要 ${p}）。`;
    s.stones -= p; s.materials[item] = (s.materials[item] || 0) + 1;
    return `以 ${p} 靈石買下「${item}」。`;
  }
};
