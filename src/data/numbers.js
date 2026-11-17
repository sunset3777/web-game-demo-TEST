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
    遊歷: { mishap: 0.15, robbery: 0.08, deadly: [0.004, 0.0025, 0.0015],   // deadly：撞見遠勝自己的妖王（依境界）；遇險受傷、被劫走靈石
            // 妖王徵兆（2026-11-08 定）：撞見妖王先出徵兆，可遁走。數值暫定，待寫入數值表
            demonKing: { fleeHurt: 0.3,              // 沒帶傷遁走：受輕傷的機率（其餘平安脫身）
                         fleeFailIfInjured: 0.4,     // 帶傷遁走：沒逃掉、受重傷的機率（不會死）
                         lightInjurySeasons: 2,      // 輕傷持續季數（一般受傷是 injurySeasons）
                         heavyInjurySeasons: 6,      // 重傷持續季數
                         // 冒險一探（2026-11-13 會議定）：三種結果的機率；身死會再乘路線修正、扣線索，扣掉的部分算進重傷
                         probeIfHealthy: { success: 0.55, heavyInjury: 0.39, death: 0.06 },
                         probeIfInjured: { success: 0.30, heavyInjury: 0.50, death: 0.20 },
                         probeSuccessInsight: 6,     // 一探成功：感悟
                         demonPillChance: 0.2,       // 一探成功（還在拿線索的前兩次）：額外掉落妖丹的機率
                         cluesPerLifeMax: 2,         // 一世最多拿到幾條妖王線索；之後一探成功只給感悟
                         cluesCountedMax: 2,         // 本世＋前人筆記的線索，最多算幾條
                         clueFleeHurtCut: 0.10,      // 每條線索：遁走受傷（含帶傷遁走失敗）機率 −0.10
                         clueFleeHurtFloor: 0.10,    //   最低到 0.10
                         clueDeathCut: 0.02,         // 每條線索：一探身死機率 −0.02
                         clueDeathFloor: 0.02,       //   最低到 0.02
                         avoidWithNotesHitChance: 0.1,   // 線索滿 2 條才有「照筆記避開」：還是撞上的機率（當作沒帶傷的一探）
                         clueWeightByLivesAgo: [1, 0.5] } },  // 前人線索的效力：隔 1 世全效、隔 2 世減半、更早沒有效果
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

  // 作派（2026-11-17 定，玄機審、衡天之後微調）：一世一組善惡、正邪、穩躁（−100～100），其他系統只讀這三軸。
  // 正值＝善／正／躁，負值＝惡／邪／穩。下一世從 0 開始
  conduct: {
    // 修練行動對穩躁的影響：減半，且行動最多只把穩躁推到 ±40，再往外要靠事件選項
    actionStepScale: 0.5,
    actionStepLimit: 40,
    describeAt: 25,                    // 一世結束寫進筆記時，三軸過 ±25 才有「寬厚／刻薄」這類描述
    sectGuidanceMaxPerLife: 2,         // 宗門指點一世最多出現幾次（玄機 11/17 定）
    darkPathOpensAtGoodEvil: -30,      // 黑市、魔音入耳：正邪還沒到門檻，但善惡 ≤ 這個值也會出現（魔種萌芽仍只看正邪）
    // 兩個「選擇走正道」選項的正邪幅度：玄機（甲）拆穿 6／相救 4，衡天（乙）拆穿 4／相救 6，協調中，先照甲
    choiceShift: { 當眾拆穿正邪: 6, 出手相救正邪: 4 },
    // 正邪機緣事件（墨淵 11/17）的「少量」與判定；TODO(衡天)：目前比照既有同類事件的小額，待調
    encounters: { smallInsight: 5, smallStones: 8, raidStones: 20, smallXiuSeasons: 1,
                  letterAmbushChance: 0.3,                               // 代送信時路上遇劫的機率
                  fightBaseWinChance: 0.55, fightWinPerRealm: 0.2,      // 鬥法：沿用妖獸襲擊「迎戰」的判定
                  fleeChance: 0.8 },                                     // 遁走：沿用妖獸襲擊「以遁術脫身」
    // 正道盤查：正邪 ≤ startAt 才會出現；抽中權重＝baseWeight＋（startAt − 正邪）× weightPerPoint，越邪越常
    inspection: { startAt: -30, baseWeight: 2, weightPerPoint: 0.1,
                  exposedChanceIfDemonSeed: 0.5,   // 配合盤查時，身上有魔種被看穿的機率（看穿就受傷）
                  evadeFailChance: 0.4 },          // 找藉口脫身失敗的機率（失敗就受傷）
    // 仇家：每次行動擲一次（機率 0 時不擲）。機率＝未了結的「仇」類中因果數 × 中 ＋ 大因果數 × 大；
    // 善惡 ≤ evilAt 時先 × evilMultiplier，再封頂：一般 chanceCap，偏惡 evilChanceCap（甲 20%；乙主張一律 15%，協調中）
    enemy: { chancePerKarma: { "中": 0.01, "大": 0.04 }, chanceCap: 0.15, evilChanceCap: 0.20, evilAt: -30, evilMultiplier: 1.5,
             fightWinChance: 0.5,                  // 迎戰得勝的機率（得勝了結一筆因果，落敗受傷）
             fleeStoneLossRatio: 1 / 3 }           // 避走時丟下的靈石比例
  },

  // 傳承
  legacy: { maxPages: 3, pageInsight: 20 }
};
