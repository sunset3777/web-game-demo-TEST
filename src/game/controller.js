// 遊戲流程控制：串接各系統。React 元件只呼叫這裡的方法，不直接改狀態。
import { numbers } from "../data/numbers.js";
import { abilities } from "../data/abilities.js";
import { util, state } from "../systems/state.js";
import { cultivation } from "../systems/cultivation.js";
import { breakthrough } from "../systems/breakthrough.js";
import { events } from "../systems/events.js";
import { opening } from "../systems/opening.js";
import { legacy } from "../systems/legacy.js";
import { growth } from "../systems/growth.js";
import { save } from "../systems/save.js";
import { travel } from "../systems/travel.js";

// 踏入新境界時的感受（提醒視窗用）
const REALM_FEEL = {
  "築基": "靈氣在丹田裡沉了下來，凝成一片安穩的根基。\n你吐出一口濁氣，覺得身子輕了，耳目也清明了許多。往後的路，還很長。",
  "金丹": "丹田中的靈氣越轉越緊，最後凝成一顆圓潤的金丹。\n你睜開眼，洞府裡的每一粒塵埃都看得清清楚楚。凡人百年，於你不過彈指。"
};

export function createGame(onChange) {
  const G = {
    s: null,
    flash: null,
    testMode: readTestMode(),
    ui: { panel: null, bt: { material: "", env: "洞府" }, tab: "log", picks: [] },

    // 死亡時也照樣寫檔：存檔留下 alive=false 的結局狀態，標題就不會再出現「繼續」讀回死前的進度；
    // 又因為結局狀態還在，重新整理結局頁後仍能從標題回到結局畫面選筆記。傳承成功後由 legacy.bequeath 清掉存檔。
    commit() { if (G.s) save.save(G.s); onChange(); },

    toggleTestMode() {
      G.testMode = !G.testMode;
      try { localStorage.setItem("xx-testmode", G.testMode ? "1" : "0"); } catch (e) {}
      onChange();
    },

    // ---- 標題 ----
    newLife(name) {
      // 這台電腦上有較新版本留下的存檔或傳承檔：開新的一世遲早會寫檔蓋掉它，所以先擋下並說明
      if (save.hasNewerSave() || save.hasNewerLegacy()) {
        G.flash = "為了不蓋掉較新版本的存檔，這裡不能開始新的一生。";
        return onChange();
      }
      G.s = state.create((name || "").trim() || opening.randomName());
      const L = save.loadLegacy();
      G.s.legacyAvailable = (L.pending || []).length > 0;
      G.s.legacyLives = L.lives || [];
      G.ui = { panel: null, bt: { material: "", env: "洞府" }, tab: "log", picks: [] };
      G.flash = null; // 結局畫面也會顯示 flash，開新的一生時清掉標題上的舊提示，免得之後誤顯示
      G.commit();
    },
    continueLife() { G.s = save.load(); G.ui.panel = null; G.flash = null; onChange(); },
    // 這一世已結束、還沒留下筆記就離開了（例如在結局畫面重新整理）：讀回結局狀態，回到選筆記的畫面
    returnToLifeEnding() {
      const savedState = save.load();
      if (!savedState || savedState.alive !== false || savedState.phase !== "end") return;
      G.s = savedState; G.ui.panel = null; G.ui.picks = []; G.flash = null;
      onChange();
    },
    toTitle() { G.s = null; onChange(); },
    // 玩家明確要求清除全部：連較新版本的存檔也一起刪掉，這是唯一會刪掉它的地方
    wipe() { save.clearEverything(); save.saveLegacy({ lives: [], pending: [] }); G.s = null; G.flash = "已清除所有存檔與傳承紀錄。"; onChange(); },

    // ---- 開局 ----
    startMortal() { opening.startMortal(G.s, "full"); G.commit(); },
    mortalAct(action) { opening.mortalAct(G.s, action); G.commit(); },
    mortalPick(i) { opening.resolveMortalEvent(G.s, i); G.commit(); },
    chooseAim(aimId) { G.s.mortalLines = opening.mortal(G.s, aimId); G.commit(); },
    takeTest() { G.s.rootLines = opening.rollRoot(G.s); G.s.awakenOpts = opening.awakeningOptions(G.s); G.commit(); },
    chooseAwakening(i) {
      const s = G.s, opt = s.awakenOpts[i];
      opening.chooseAwakening(s, opt);
      s.lastText = `你在入定幻境中看見：「${abilities.vision(opt.ability, opt.tag)}」\n醒來時，你已悟得「${opt.ability}」，並以「${opt.technique}」為主修功法。修仙之路，從今日開始。`;
      state.log(s, s.lastText);
      if (s.legacyAvailable) state.log(s, "（傳聞這附近藏著一座前人遺府，遊歷時或許能遇上。）");
      s.notice = {
        title: "老執事的叮囑",
        text: "臨走前，老執事又叫住你：\n「修行急不得。吐納、運轉周天、閉關、出門遊歷，不論做哪一樣，一坐下去便是一季。\n春去秋來，壽元也就這麼一季一季過去了。想清楚再動身。」"
      };
      G.commit();
    },

    // ---- 行動 ----
    // 死亡或退隱後交由 NPC 規則接手，NPC 系統尚未實作（見實作計畫階段 4）。
    // 在那之前，這一世結束後玩家的操作（行動、突破、買賣、換功法、裝備、走火入魔的抉擇）一律不做任何事，
    // 與 retire、pick、nextQueue 對已死狀態不動作一致。
    hasPlayerControlEnded() { return !G.s || !G.s.alive; },
    doAction(action, full) {
      if (G.hasPlayerControlEnded()) return;
      const s = G.s;
      if (s.current) return;
      const res = cultivation.run(s, action, full);
      const lines = res.lines;
      if (action === "遊歷" && s.alive) lines.push(travel.collectRoadsideLoot(s, res.seasons));
      if (s.alive && util.chance(res.eventChance)) {
        const e = events.pick(s, action);
        if (e) s.queue.push({ type: "event", id: e.id });
      }
      s.lastText = lines.join("\n");
      state.log(s, s.lastText);
      G.nextQueue();
      G.commit();
    },

    togglePanel(name) { G.ui.panel = G.ui.panel === name ? null : name; onChange(); },
    setBt(key, value) { G.ui.bt[key] = value; onChange(); },
    doBreakthrough() {
      if (G.hasPlayerControlEnded()) return;
      const s = G.s;
      if (!breakthrough.envUsable(s, G.ui.bt.env)) { s.lastText = "這個季節無法在那裡突破。"; return onChange(); }
      const realmBefore = s.realmIndex, lenBefore = state.realm(s).longLen;
      const lines = breakthrough.attempt(s, { material: G.ui.bt.material || null, env: G.ui.bt.env });
      if (s.alive && s.realmIndex > realmBefore) {
        const r = state.realm(s), L = r.longLen;
        const span = { 1: "一季", 2: "半年", 4: "一年", 6: "一年半", 8: "兩年" }[L] || `${L} 季`;
        const feel = REALM_FEEL[r.id] || "天地在你眼中，似乎換了一副模樣。";
        const time = L !== lenBefore
          ? `\n\n你也發覺時間過得不一樣了。從前一次入定不過${({ 1: "一季", 4: "一年", 6: "一年半" })[lenBefore] || "片刻"}，如今一閉眼，便是${span}。\n若有要緊的事得趕上，也可以只坐一季便起身，只是這樣難以把功夫修滿。`
          : "";
        const melt = growth.onRealmUp(s);
        if (melt.length) lines.push(...melt);
        s.notice = { title: `踏入${r.id}`, text: feel + (melt.length ? "\n\n" + melt.join("\n") : "") + time };
      }
      G.ui.bt.material = ""; G.ui.panel = null;
      s.lastText = lines.join("\n");
      state.log(s, s.lastText);
      G.nextQueue();
      G.commit();
    },
    buy(item) { if (G.hasPlayerControlEnded()) return; const s = G.s; s.lastText = cultivation.buy(s, item); state.log(s, s.lastText); G.commit(); },
    setTechnique(t) { if (G.hasPlayerControlEnded()) return; const s = G.s; s.technique = t; s.lastText = `改以「${t}」為主修功法。`; state.log(s, s.lastText); G.commit(); },
    equip(a) { if (G.hasPlayerControlEnded()) return; G.s.equipped = a || null; G.commit(); },
    retire() { legacy.die(G.s, "坐化"); G.commit(); },
    setTab(t) { G.ui.tab = t; onChange(); },
    dismissNotice() { if (G.s) G.s.notice = null; G.commit(); },

    // ---- 三選一與事件 ----
    nextQueue() {
      const s = G.s;
      if (!s.alive) { s.current = null; return; }
      while (!s.current && s.queue.length) {
        const q = s.queue.shift();
        if (q.type === "growth") {
          const opts = breakthrough.growthOptions(s);
          if (opts.length) s.current = { type: "growth", options: opts.map(o => o.name) };
        } else if (q.type === "ability") {
          const opts = breakthrough.abilityOptions(s, q.timing, q.judge, q.tags);
          if (opts.length) s.current = { type: "ability", level: q.judge ? q.judge.level : "一般", options: opts.map(o => o.name) };
        } else if (q.type === "event") {
          s.current = { type: "event", id: q.id };
        } else if (q.type === "qiudeviation") {
          s.current = { type: "deviation" };
        }
      }
    },
    pick(i) {
      const s = G.s, c = s.current;
      if (!c) return;
      if (c.type === "growth") {
        s.lastText = growth.pick(s, c.options[i]);
      } else if (c.type === "ability") {
        const a = abilities.pool.find(x => x.name === c.options[i]);
        s.abilities.push(a.name);
        s.lastText = `你走向「${abilities.vision(a.name)}」的幻境，悟得「${a.name}」。\n〔${a.name}：${a.desc}〕`;
        state.note(s, `突破時於幻境中悟得${a.name}。`);
      } else if (c.type === "event") {
        const e = events.find(c.id);
        s.lastText = `【${e.title}】` + events.resolve(s, e, i);
      }
      state.log(s, s.lastText);
      s.current = null;
      G.nextQueue();
      G.commit();
    },
    deviate(choice) {
      if (G.hasPlayerControlEnded()) return;
      const s = G.s;
      s.lastText = breakthrough.deviation(s, choice);
      state.log(s, s.lastText);
      s.current = null;
      G.nextQueue();
      G.commit();
    },

    // ---- 結局與傳承 ----
    toggleNotePick(i) {
      const p = G.ui.picks, k = p.indexOf(i);
      if (k >= 0) p.splice(k, 1); else if (p.length < numbers.legacy.maxPages) p.push(i);
      onChange();
    },
    bequeath() {
      const { isLegacySaved, pageCount } = legacy.bequeath(G.s, G.ui.picks);
      if (!isLegacySaved) {
        // 傳承沒寫進去：留在結局畫面，舊存檔與勾選的筆記都還在，玩家可以稍後再按一次
        G.flash = "存檔失敗，舊存檔仍保留，請稍後再試。";
        return onChange();
      }
      G.s = null; G.ui.picks = [];
      G.flash = pageCount ? `留下了 ${pageCount} 頁筆記。下一世遊歷時，或許能在某處洞府找到它們。` : "這一世沒有留下筆記。";
      onChange();
    }
  };
  return G;
}

function readTestMode() {
  try { return localStorage.getItem("xx-testmode") === "1"; } catch (e) { return false; }
}
