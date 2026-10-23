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

  // 選定要傳下的筆記頁，寫入傳承檔
  bequeath(s, noteIndexes) {
    const st = state, N = numbers;
    const L = save.loadLegacy();
    const pages = noteIndexes.slice(0, N.legacy.maxPages).map(i => s.notes[i]).filter(Boolean)
      .map(n => ({ text: n.text, kind: n.kind, realm: n.realm, from: s.name }));
    L.lives.push({ name: s.name, title: this.title(s), realm: st.stageName(s), age: Math.floor(st.age(s)), cause: s.cause, root: s.root ? s.root.label : "" });
    L.pending = (L.pending || []).concat(pages);
    save.saveLegacy(L);
    save.clear();
    return pages.length;
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
