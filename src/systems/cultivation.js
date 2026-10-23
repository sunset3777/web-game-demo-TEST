// 修練系統：季節推進、長短行動、修為與小境界、瓶頸感悟、受傷、壽元
import { numbers } from "../data/numbers.js";
import { util, state } from "./state.js";
import { events } from "./events.js";
import { legacy } from "./legacy.js";
import { layoutData } from "../data/layout.js";
import { routes } from "./routes.js";
import { flavor } from "../data/flavor.js";

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
    m *= st.aging(s).cult;
    m *= routes.cultMult(s, action);
    return m;
  },

  insightPerSeason(s, action) {
    const b = state.bonuses(s);
    return numbers.actions[action].insight * (1 + b.insight) * (action === "遊歷" ? routes.mod(s, "travelInsight", 1) : 1);
  },

  // 閉關每季的靈石花費、連續閉關的效率
  secludeCost(s) { const c = numbers.risk.閉關.cost; return c[Math.min(s.realmIndex, c.length - 1)]; },
  streakFactor(s) {
    const R = numbers.risk.閉關, k = s.secludeStreak || 0;
    return Math.max(R.streakMin, 1 - R.streakDecay * Math.max(0, k - 1));
  },

  // 出事：沒傷就受傷；已帶傷就有機率身死。回傳 true＝死亡
  mishap(s, out, hurtText, deathText, cause, deathChance) {
    const N = numbers;
    if (s.injury > 0 && util.chance((deathChance ?? N.risk.deathIfInjured) * routes.deathMult(s))) {
      out.push(deathText);
      legacy.die(s, cause);
      return true;
    }
    s.injury = Math.max(s.injury, N.injurySeasons);
    out.push(hurtText);
    this._hurtStop = true;   // 受了傷，這次行動提前結束（回去養傷）
    return false;
  },

  // 選項上的徵兆（不寫數字）
  omen(s, action) {
    const N = numbers, hurt = s.injury > 0;
    if (action === "周天") {
      if (hurt) return "傷勢未癒，強運周天恐怕兇險";
      if (routes.demonEff(s) >= N.demon.gate) return "心緒不寧，氣息隱隱逆行";
    }
    if (action === "閉關") {
      if (s.stones < this.secludeCost(s)) return "靈石不足，洞府靈氣日漸稀薄";
      if ((s.secludeStreak || 0) >= 2) return "閉關日久，心神有些凝滯";
      if (routes.demonEff(s) >= N.demon.gate) return "心魔在靜坐時越發清晰";
    }
    if (action === "遊歷" && hurt) return "傷勢未癒，出門恐怕兇險";
    return null;
  },

  // 執行行動。full＝修滿整段；回傳結果文字陣列
  run(s, action, full) {
    const N = numbers, st = state, U = util, A = N.actions[action];
    const L = this.length(s, action);
    const n = full ? L : 1;
    const b = st.bonuses(s);
    const out = [];
    let gained = 0, insightGained = 0, done = 0, interrupted = false, starved = false;
    const R = N.risk;
    if (action === "閉關") s.secludeStreak = (s.secludeStreak || 0) + 1; else s.secludeStreak = 0;
    routes.onAction(s, action);
    const flavorLine = U.pick(flavor[action][st.season(s)]);
    const injMul = routes.injuryMult(s);
    const streak = action === "閉關" ? this.streakFactor(s) : 1;

    this._hurtStop = false;
    for (let i = 0; i < n; i++) {
      // 閉關：先付靈石；付不起就只能靠稀薄的天地靈氣
      let paid = true, stop = false;
      if (action === "閉關") {
        const cost = this.secludeCost(s);
        if (s.stones >= cost) s.stones -= cost; else { paid = false; starved = true; }
        // 被驚擾
        if (U.chance(R.閉關.interrupt + R.閉關.interruptPerStreak * ((s.secludeStreak || 1) - 1))) {
          interrupted = true;
          if (routes.demonEff(s) >= N.demon.gate) {
            s.demon = Math.min(N.demon.max, s.demon + R.閉關.interruptDemon);
            if (this.mishap(s, out, "閉關時洞府外一聲巨響，你心神失守，氣血逆湧，受了內傷。", "閉關時被驚擾，心魔趁虛而入。你再也沒能睜開眼睛。", "走火")) { done++; break; }
          }
          stop = true;   // 這一季照算，之後出關
        }
      }
      const wasBottleneck = st.inBottleneck(s);
      if (wasBottleneck) {
        const g = this.insightPerSeason(s, action);
        s.insight += g; insightGained += g;
      } else if (!s.demoEnd) {
        let g = this.xiuPerSeason(s, action) * streak;
        if (action === "閉關" && !paid) g *= 0.75 / A.mult;   // 沒靈石：比吐納還差一點
        if (full && L > 1) g *= N.fullSegmentBonus;
        s.xiu += g; gained += g;
        this.checkStages(s, out);
      }
      // 心魔
      let d = (action === "閉關" && !paid ? 0 : A.demon) + routes.mod(s, "demonPerSeason", 0);
      if (d > 0) d *= b.demonGain;
      s.demon = Math.max(0, Math.min(N.demon.max, s.demon + d));
      // 受傷
      if (s.injury > 0) s.injury--;
      if (action === "周天") {
        const p = R.周天.mishap + Math.max(0, routes.demonEff(s) - N.demon.gate) * R.周天.perDemon;
        if (U.chance(p * b.injury * injMul) && this.mishap(s, out, "運轉周天時氣息逆行，你岔了氣，經脈受了傷。", "周天運到一半，氣息在經脈裡逆衝而上。舊傷崩裂，你一口血噴出，倒在蒲團上。", "經脈逆衝")) { done++; break; }
      }
      if (action === "吐納" && U.chance(R.吐納.trouble)) {
        if (U.chance(0.5) && s.stones > 0) { const lost = Math.ceil(s.stones / 3); s.stones -= lost; out.push(`鎮上的地痞找上門來，你破財消災，賠了 ${lost} 塊靈石。`); }
        else if (this.mishap(s, out, "鄰里起了紛爭，你上前勸架，被誤傷了。", "仇家趁你帶傷尋上門來。你沒能撐到天亮。", "仇家尋仇", R.吐納.deathIfInjured)) { done++; break; }
      }
      if (action === "遊歷") {
        const dl = R.遊歷.deadly[Math.min(s.realmIndex, R.遊歷.deadly.length - 1)];
        if (U.chance(dl)) { out.push("你在山中撞見一頭氣息遠勝於你的妖王。你甚至來不及轉身。"); legacy.die(s, "遇劫身死"); done++; break; }
        if (U.chance(R.遊歷.mishap * b.injury * injMul) && this.mishap(s, out, "途中遇上妖獸，你拼死脫身，受了傷。", "途中遇上劫修。你本就帶傷，沒能逃掉。", "遇劫身死")) { done++; break; }
        if (this.secretOpen(s) && s.secretTaken !== s.secretAt) {
          const S = N.secret, ri = Math.min(s.realmIndex, 2);
          s.secretTaken = s.secretAt;
          if (st.inBottleneck(s)) { s.insight += S.insight[ri]; insightGained += S.insight[ri]; }
          else { s.xiu += S.xiu[ri]; gained += S.xiu[ri]; this.checkStages(s, out); }
          const mats = Object.keys(layoutData.materials);
          let mat = null; if (U.chance(S.material)) { mat = U.pick(mats); s.materials[mat] = (s.materials[mat] || 0) + 1; }
          out.push(`你趕上了秘境開啟，在裡頭闖了一遭，收穫頗豐${mat ? `，還帶出一份${mat}` : ""}。`);
        }
        if (U.chance(R.遊歷.robbery) && s.stones > 0) { const lost = Math.ceil(s.stones / 2); s.stones -= lost; out.push(`途中遭人暗算，被搶走了 ${lost} 塊靈石。`); }
      }
      done++;
      if (this.advanceSeason(s, out)) break;  // 壽盡
      if (stop || this._hurtStop) break;
    }

    const head = `${action}${done > 1 ? `了 ${done} 季` : "一季"}`;
    const parts = [];
    if (gained > 0) parts.push(`修為 +${Math.round(gained)}`);
    if (insightGained > 0) parts.push(`感悟 +${Math.round(insightGained)}`);
    if (interrupted && s.alive) out.unshift("閉關途中被外事驚擾，只得提前出關。");
    if (this._hurtStop && s.alive && done < n) out.push("帶著傷，你只得提前收手，回去調養。");
    if (starved) out.push("靈石耗盡，洞府靈氣稀薄，修練事倍功半。");
    out.unshift(`〔${head}${parts.length ? `：${parts.join("，")}` : ""}〕`);
    out.unshift(flavorLine);
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
          if (s.insightBank > 0) { s.insight += s.insightBank; out.push(`前人留下的心得在此刻派上用場，你心中豁然開朗。\n〔感悟 +${s.insightBank}〕`); s.insightBank = 0; }
          s.xiu = st.stageReq(s);
        }
        return;
      }
      if (s.stageRest > 0) return;   // 調息中，修為照樣累積但不能衝關
      const de = routes.demonEff(s);
      const rate = Math.max(0.05, N.smallStageRate - Math.min(de, N.demon.gate) * N.demon.penalty - Math.max(0, de - N.demon.gate) * N.demon.forcePenalty);
      if (U.chance(rate)) {
        s.xiu -= st.stageReq(s);
        s.stageIndex++;
        out.push(`突破至${st.stageName(s)}。`);
        s.queue.push({ type: "growth" });
      } else {
        const F = N.smallStageFail;
        s.xiu = Math.min(s.xiu, st.stageReq(s) * F.dropTo);
        s.stageRest = F.restActions * st.realm(s).longLen;
        out.push(`衝擊${st.realm(s).stages[s.stageIndex + 1]}失敗，氣血翻湧，修為散去了一些。得先調息一陣，才能再試。`);
        return;
      }
    }
  },

  // 世事變遷：秘境定期開啟，提前傳聞；錯過就沒了
  worldTick(s, out) {
    const S = numbers.secret, U = util;
    if (s.secretAt == null) s.secretAt = s.seasons + U.rand(S.every[0], S.every[1]);
    const left = s.secretAt - s.seasons;
    if (left === S.notice) out.push("坊間傳聞：西邊山裡的秘境，過些日子就要開了。");
    if (left === 0) out.push("西邊山裡霞光沖天，秘境開了。");
    if (left <= -S.window) { s.secretAt = s.seasons + U.rand(S.every[0], S.every[1]); out.push("秘境的霞光散了，入口重新隱沒在山霧裡。"); }
  },
  secretOpen(s) { const left = s.secretAt - s.seasons; return s.secretAt != null && left <= 0 && left > -numbers.secret.window; },

  // 推進一季；壽盡時回傳 true
  advanceSeason(s, out) {
    const st = state;
    s.seasonIdx = (s.seasonIdx + 1) % 4;
    s.seasons++;
    if (s.stageRest > 0) s.stageRest--;
    events.fadeKarma(s);
    this.worldTick(s, out);
    // 久困瓶頸：心生焦躁
    if (st.inBottleneck(s)) {
      s.neckSeasons = (s.neckSeasons || 0) + 1;
      const K = numbers.neck;
      if (s.neckSeasons > K.graceSeasons * st.realm(s).longLen) {
        s.demon = Math.min(numbers.demon.max, s.demon + K.demonPerSeason);
        if (!s.neckWarned) { s.neckWarned = true; out.push("你在瓶頸前徘徊已久，心中漸生焦躁。"); }
      }
    } else { s.neckSeasons = 0; s.neckWarned = false; }
    // 氣血衰退的徵兆（各提醒一次）
    const ag = st.aging(s);
    if (ag.ratio > numbers.aging.from && !s.agedWarn1) { s.agedWarn1 = true; out.push("攬鏡自照，你發現兩鬢已見白髮。氣血不復當年，修練漸感吃力。"); st.note(s, "兩鬢見白，氣血漸衰。", "里程碑"); }
    if (ag.ratio > numbers.aging.capFrom && !s.agedWarn2) { s.agedWarn2 = true; out.push("你清楚感覺到，時間不多了。再不突破，往後只會越來越難。"); }
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
