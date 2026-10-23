// 數值設定：沿用「修仙小遊戲_demo數值表_v4.xlsx」。調整平衡只改這個檔案。

export const numbers = {
  version: "v7",
  seasons: ["春", "夏", "秋", "冬"],
  testAge: 18,            // 靈根測試年齡
  mortalMaxSeasons: 12,   // 凡人期最多可玩季數

  // 境界：stages＝各小境界所需修為；perSeason＝每季基礎修為；life＝壽元（歲）；
  // longLen＝長行動一次耗時（季）；major＝大境界突破參數
  realms: [
    { id: "煉氣", stages: ["第1層", "第2層", "第3層", "第4層", "第5層", "第6層", "第7層", "第8層", "第9層", "第10層"],
      reqs: [40, 50, 60, 70, 80, 90, 100, 110, 120, 130], perSeason: 25, life: 90, longLen: 1,
      major: { base: 0.30, cap: 0.99, k: 100, keep: 0.30 }, tier: "入門" },
    { id: "築基", stages: ["初期", "中期", "後期", "圓滿"],
      reqs: [1500, 2000, 2500, 3000], perSeason: 60, life: 140, longLen: 4,
      major: { base: 0.15, cap: 0.965, k: 300, keep: 0.40 }, tier: "築基" },
    { id: "金丹", stages: ["初期", "中期", "後期", "圓滿"],
      reqs: [12000, 15000, 18000, 21000], perSeason: 250, life: 500, longLen: 6,
      major: null, tier: "金丹" }  // demo 終點（元嬰不在 demo）
  ],
  // 體質覺醒（2026-10-19 定）：佈局達覺醒門檻＋靈根有該屬性才擲機率；靈根決定成功率與起始品階
  // rungs＝品階（之體→靈體→聖體→道體）；同系再覺醒爬一階；失敗或屬性不合降為共鳴
  constitution: {
    chance: { single: 0.70, fusion: 0.70, dual: 0.50, triple: 0.35, quad: 0.25, penta: 0.15 },
    heavenBonus: 0.20, maxChance: 0.95,     // 天人合一額外成功率、上限
    startRung: { single: 1, fusion: 1, dual: 0, triple: 0, quad: 0, penta: 0 },
    mults: [1.2, 1.35, 1.5, 1.7],            // 各品階的標籤倍率
    heavenLife: 20                           // 天人合一覺醒時壽元 +20
  },

  // 成長池（小境界三選一）：同一種體悟每個境界最多幾重；達到重數時改名進化
  // caps 依境界：煉氣 2、築基 4、金丹 5、元嬰 8（元嬰不在 demo）；上限本身就是境界門檻
  growth: { caps: [2, 4, 5, 8], tiers: [3, 6] },
  smallStageRate: 0.85,       // 小境界突破成功率
  // 小境界衝關失敗（2026-10-19 定，v6）：修為壓到門檻的 85% 以下，並需調息（長行動次數 × 該境界長行動季數）才能再衝
  smallStageFail: { dropTo: 0.85, restActions: 2 },

  // 心魔、道傷
  demon: { max: 100, penalty: 0.002, gate: 20, forcePenalty: 0.005, failAdd: 30, failExtra: 10, forceMult: 2 },
  scar: { perLayer: 0.03, maxLayers: 5 },

  // 靈根（demo 機率）
  roots: {
    single:  { name: "單靈根", mult: 1.5, tag: 1.5, chance: 0.05 },
    dual:    { name: "雙靈根", mult: 1.25, tag: 1.3, chance: 0.15 },   // 測出兩屬性的總機率（含融合）
    fusion:  { name: "融合變異靈根", mult: 1.6, tag: 1.6 },
    triple:  { name: "三靈根", mult: 1.0, tag: 1.15, chance: 0.30 },
    quad:    { name: "四靈根", mult: 0.85, tag: 1.08, chance: 0.30 },
    penta:   { name: "五靈根", mult: 0.7, tag: 1.0, chance: 0.20 },
    fuseRate: { "相生": 0.40, "相剋": 0.15 },   // demo 機率（正式版 0.15／0.05）
    fruitFuseRate: 1.0                          // 僅 demo：凡人期誤食靈果後必定融合
  },

  // 行動（每季）。long＝長行動（耗時依境界）
  actions: {
    "吐納": { long: true, mult: 0.85, insight: 5, demon: -1, injury: 0, event: 0.2 },
    "周天": { long: true, mult: 1.5, insight: 7, demon: 5, injury: 0.05, event: 0.2 },
    "閉關": { long: true, mult: 1.3, insight: 8, demon: -5, injury: 0, event: 0.15 },
    "遊歷": { long: true, mult: 0.3, insight: 10, demon: 0, injury: 0.15, event: 0.6 }
  },
  fullSegmentBonus: 1.1,       // 長行動修滿整段的修為獎勵
  seasonMult: { "春": { cult: 1.10, seclude: 1.0 }, "夏": { cult: 1.0, seclude: 1.0 },
                "秋": { cult: 1.0, seclude: 1.0 }, "冬": { cult: 1.0, seclude: 1.15 } },
  injurySeasons: 3,            // 受傷持續季數（期間修為減半）

  // 修練風險（2026-10-19 定）：四個行動各有不同風險；帶傷再出事才會致命，死前一定有徵兆
  risk: {
    deathIfInjured: 0.45,      // 已帶傷時又出事 → 身死的機率
    周天: { mishap: 0.05, perDemon: 0.015 },          // 岔氣機率＝基礎＋（心魔−門檻）×每點
    閉關: { cost: [3, 8, 20], streakDecay: 0.15, streakMin: 0.55,   // 每季靈石（依境界）；連續閉關效率遞減
            interrupt: 0.03, interruptPerStreak: 0.03, interruptDemon: 10 },  // 被驚擾：心魔 ≥ 門檻時會受傷
    吐納: { trouble: 0.08, deathIfInjured: 0 },     // 俗事纏身：捲入紛爭受傷、被敲詐；在家養傷不會因此喪命
    遊歷: { mishap: 0.15, robbery: 0.08, deadly: [0.004, 0.0025, 0.0015] },   // deadly：遇上遠勝自己的強敵（依境界，沒傷也可能死）             // 遇險受傷、被劫走靈石
    forcedFailDeath: 0.25,     // 心魔過高強行衝關失敗 → 身死
    holdOnDeath: 0.30          // 走火入魔選「硬撐」→ 撐不過去
  },

  // 時間流逝（2026-10-19 定）
  aging: { from: 0.5, cultDrop: 1.2, cultMin: 0.4,     // 壽元過半：修練效率 ×(1 − (比例−0.5)×1.2)，最低 0.4
           capFrom: 0.75, capDrop: 0.8 },              // 過七成五：突破成功率上限 −(比例−0.75)×0.8
  neck: { graceSeasons: 3, demonPerSeason: 5 },        // 久困瓶頸：超過寬限季數後每季心魔 +3
  secret: { every: [10, 16], notice: 4, window: 2,     // 秘境：每 10～16 季一次，提前 4 季傳聞，開 2 季
            insight: [40, 120, 300], xiu: [60, 1500, 9000], material: 0.8 },  // 遊歷進秘境的收穫（依境界）

  // 遊歷收入
  travel: { stonesMin: 3, stonesMax: 12, materialChance: 0.35 },

  // 坊市基準價（靈石）與季節倍率
  market: {
    prices: { "庚金之精": 15, "青木靈髓": 10, "千年寒玉": 25, "火靈芝": 10, "息壤": 15, "妖獸內丹": 20,
              "雷擊木": 30, "古劍殘片": 30, "玄水青蓮": 30 },
    category: { "庚金之精": "礦石", "息壤": "礦石", "青木靈髓": "靈草", "火靈芝": "靈草", "玄水青蓮": "靈草",
                "千年寒玉": "寒性", "妖獸內丹": "妖獸", "雷擊木": "礦石", "古劍殘片": "礦石" },
    seasonMult: { "靈草": [0.8, 1.0, 1.0, 1.2], "礦石": [1.0, 1.0, 0.9, 1.1], "妖獸": [1.0, 0.85, 1.0, 1.1],
                  "寒性": [1.1, 1.2, 1.0, 0.8] }
  },

  // 因果淡去時間（季）；大因果不淡去
  karma: { fade: { "小": 8, "中": 60, "大": Infinity }, maxOpen: 6 },

  // 傳承
  legacy: { maxPages: 3, pageInsight: 20 }
};
