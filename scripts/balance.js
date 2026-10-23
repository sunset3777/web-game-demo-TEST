// 平衡測試：三種玩家（小心／普通／莽撞）各玩 N 輪，看到達金丹的比例與死因：npm run balance
import { createGame } from "../src/game/controller.js";
import { state, util } from "../src/systems/state.js";
import { marks } from "../src/data/marks.js";
import { breakthrough } from "../src/systems/breakthrough.js";
import { cultivation } from "../src/systems/cultivation.js";
import { numbers } from "../src/data/numbers.js";
import { events } from "../src/systems/events.js";

let seen = {};

globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };

// respect＝看到徵兆時收手的機率；target＝突破前想要的成功率；mix＝平常各行動的比重
const players = {
  只吐納: { respect: 0.95, target: 0.85, mix: { 吐納: 1 } },
  小心: { respect: 0.95, target: 0.85, mix: { 閉關: 4, 周天: 1, 遊歷: 3, 吐納: 2 } },
  普通: { respect: 0.70, target: 0.70, mix: { 閉關: 4, 周天: 3, 遊歷: 2, 吐納: 1 } },
  莽撞: { respect: 0.25, target: 0.50, mix: { 閉關: 3, 周天: 5, 遊歷: 2, 吐納: 0 } }
};

function pickMix(mix) {
  const list = Object.entries(mix);
  return util.weightedDistinct(list, x => x[1], 1)[0][0];
}

function play(P, r) {
  const G = createGame(() => {});
  G.newLife("測" + r);
  G.chooseAim(marks.aims[r % marks.aims.length].id);
  G.takeTest(); G.chooseAwakening(0); G.s.notice = null;
  let guard = 0;
  while (G.s.alive && !G.s.demoEnd && guard++ < 4000) {
    const s = G.s; s.notice = null;
    if (s.current) {
      if (s.current.type === "deviation") G.deviate(util.chance(P.respect) ? "散功重修" : util.pick(["硬撐", "入魔"]));
      else if (s.current.type === "event") { const e = events.find(s.current.id); const n = events.choices(s, e).length; seen[e.id] = (seen[e.id] || 0) + 1; G.pick(Math.floor(Math.random() * n)); }
      else G.pick(0);
      continue;
    }
    const cost = cultivation.secludeCost(s), careful = util.chance(P.respect);
    const lifeLeft = state.maxAge(s) - state.age(s);
    if (state.inBottleneck(s)) {
      const br = breakthrough.rate(s);
      const old = state.aging(s).ratio > 0.7;   // 氣血衰退後就不等了
      if (br.rate >= P.target || lifeLeft < 8 || (old && br.rate >= 0.4) || (!careful && br.forced)) {
        G.ui.bt = { material: Object.keys(s.materials)[0] || "", env: "洞府" };
        G.doBreakthrough(); continue;
      }
    }
    let a;
    if (careful && s.injury > 0) a = "吐納";
    else if (careful && cultivation.secretOpen(s) && P.mix.遊歷 !== undefined) a = "遊歷";
    else if (careful && s.demon >= numbers.demon.gate) a = s.stones >= cost ? "閉關" : "吐納";
    else if (careful && (s.secludeStreak || 0) >= 2) a = "遊歷";
    else a = pickMix(P.mix);
    if (a === "閉關" && s.stones < cost && careful) a = "遊歷";
    G.doAction(a, true);
  }
  return G.s;
}

// 里程碑：依序檢查達到了哪一關
const MILESTONES = [
  ["煉氣第5層", s => s.realmIndex > 0 || s.stageIndex >= 4],
  ["煉氣第10層", s => s.realmIndex > 0 || s.stageIndex >= 9],
  ["築基", s => s.realmIndex >= 1],
  ["築基圓滿", s => s.realmIndex > 1 || (s.realmIndex === 1 && s.stageIndex >= 3)],
  ["金丹", s => s.realmIndex >= 2],
  ["金丹圓滿", s => s.demoEnd]
];

const runs = Number(process.argv[2] || 200);
const table = {};
for (const [name, P] of Object.entries(players)) {
  const causes = {}, reach = { 煉氣: 0, 築基: 0, 金丹: 0 }, routeCount = {}, routeGold = {};
  seen = {};
  let turns = 0;
  for (let r = 0; r < runs; r++) {
    const s = play(P, r);
    reach[state.realm(s).id]++;
    routeCount[s.route || "氣修"] = (routeCount[s.route || "氣修"] || 0) + 1;
    if (s.realmIndex >= 2) routeGold[s.route || "氣修"] = (routeGold[s.route || "氣修"] || 0) + 1;
    table[name] ??= {};
    MILESTONES.forEach(([m, ok]) => { if (ok(s)) table[name][m] = (table[name][m] || 0) + 1; });
    const c = s.demoEnd ? "金丹圓滿" : (s.cause || "未結束");
    causes[c] = (causes[c] || 0) + 1; turns += s.turns;
  }
  const pc = x => Math.round(x / runs * 100) + "%";
  console.log(`${name}：到金丹 ${pc(reach.金丹)}・停在築基 ${pc(reach.築基)}・停在煉氣 ${pc(reach.煉氣)}・平均回合 ${Math.round(turns / runs)}`);
  console.log("   結局：", Object.entries(causes).map(([k, v]) => `${k} ${pc(v)}`).join("、"));
  console.log("   路線（佔比／該路線到金丹）：", Object.entries(routeCount).map(([k, v]) => `${k} ${pc(v)}／${Math.round((routeGold[k] || 0) / v * 100)}%`).join("、"));
  const tot = Object.values(seen).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(seen).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} ${Math.round(v / tot * 100)}%`);
  console.log(`   事件：共 ${Object.keys(seen).length} 種，最常見：${top.join("、")}`);
}

// 從凡人到各境界的機率表
const rows = {};
MILESTONES.forEach(([m]) => { rows[m] = {}; Object.keys(players).forEach(n => rows[m][n] = Math.round(((table[n] || {})[m] || 0) / runs * 100) + "%"); });
console.log("\n到達各境界的機率：");
console.table(rows);
