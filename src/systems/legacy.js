// 傳承系統：一生結束、一生評價、選筆記頁傳給下一世、前人遺府取得
import { numbers } from "../data/numbers.js";
import { state } from "./state.js";
import { save } from "./save.js";

export const legacy = {
  die(s, cause) {
    if (!s.alive) return;
    s.alive = false; s.cause = cause; s.phase = "end";
    state.note(s, `${cause}，享年 ${Math.floor(state.age(s))} 歲。`, "結局");
  },

  title(s) {
    const st = state;
    const r = st.realm(s).id;
    if (s.cause === "入魔") return "墮魔者";
    if (s.demoEnd) return "金丹真人";
    if (r === "金丹") return "金丹修士";
    if (r === "築基") return s.stats.breakFails >= 3 ? "屢敗屢戰的築基修士" : "築基修士";
    return s.stats.breakFails >= 3 ? "困守煉氣的苦修者" : "煉氣散修";
  },

  // 選定要傳下的筆記頁，寫入傳承檔。回傳 { isLegacySaved, pageCount }：
  // 傳承檔確定寫入成功才清掉舊存檔；寫入失敗時存檔原樣保留，玩家之後還能再傳一次
  bequeath(s, noteIndexes) {
    const st = state, N = numbers;
    const L = save.loadLegacy();
    const pages = noteIndexes.slice(0, N.legacy.maxPages).map(i => s.notes[i]).filter(Boolean)
      .map(n => ({ text: n.text, kind: n.kind, realm: n.realm, from: s.name }));
    L.lives.push({ name: s.name, title: this.title(s), realm: st.stageName(s), age: Math.floor(st.age(s)), cause: s.cause, root: s.root ? s.root.label : "" });
    L.pending = (L.pending || []).concat(pages);
    this.passDownDemonKingClues(s, L);
    const isLegacySaved = save.saveLegacy(L);
    if (!isLegacySaved) return { isLegacySaved, pageCount: 0 };
    save.clear();
    return { isLegacySaved, pageCount: pages.length };
  },

  // 妖王線索自動傳下去，不佔筆記頁名額（11/13 會議定）。
  // 傳承檔原本不記世代，這裡用「前世清單的第幾世」當世代編號記在每條線索上，下一世才算得出隔了幾世。
  // 隔 3 世以上已經沒有效果的線索，在這裡順手清掉。沒有任何線索時不寫這個欄位，傳承檔維持原樣
  passDownDemonKingClues(s, legacyData) {
    const lifeNumber = legacyData.lives.length;
    const ownClues = (s.demonKingClues || []).map(clue => ({ type: clue.type, text: clue.text, life: lifeNumber, from: s.name }));
    if (!ownClues.length && !legacyData.demonKingClues) return;
    const usefulLivesAgo = numbers.risk.遊歷.demonKing.clueWeightByLivesAgo.length;
    legacyData.demonKingClues = (legacyData.demonKingClues || []).filter(clue => lifeNumber + 1 - clue.life <= usefulLivesAgo).concat(ownClues);
  },

  // 新的一世開始時讀進前人的妖王線索：隔 1 世全效、隔 2 世減半、更早沒有效果
  inheritDemonKingClues(s, legacyData) {
    const weights = numbers.risk.遊歷.demonKing.clueWeightByLivesAgo;
    const thisLifeNumber = (legacyData.lives || []).length + 1;
    const inherited = (legacyData.demonKingClues || [])
      .map(clue => ({ type: clue.type, text: clue.text, weight: weights[thisLifeNumber - clue.life - 1] || 0 }))
      .filter(clue => clue.weight > 0);
    if (!inherited.length) return;
    s.inheritedDemonKingClues = inherited;
    state.note(s, "前人筆記裡記著妖王的事：" + inherited.map(clue => clue.text).join(""), "傳承");
  },

  // 前人遺府：取走所有待取的筆記頁，每頁化為感悟
  take(s) {
    const st = state, N = numbers;
    const L = save.loadLegacy();
    const pages = L.pending || [];
    L.pending = []; save.saveLegacy(L);
    s.legacyAvailable = false;
    const bonus = pages.length * N.legacy.pageInsight;
    if (bonus) {
      if (st.inBottleneck(s)) s.insight += bonus; else s.insightBank += bonus;
      st.note(s, `於前人遺府得手札 ${pages.length} 頁（${pages[0].from} 所留）。`, "傳承");
    }
    return pages;
  }
};
