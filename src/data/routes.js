// 修練路線與傾向（資料）。新增路線只要在 routes 裡加一筆，並在事件資料裡寫「入門事件鏈」。
//
// 傾向（tendency）
//   行事：四個修練行動的累積次數（越近的越重要，每次行動舊的乘上 decay）
//   心性：兩條軸，範圍 −100～100
//     正邪：正＝仁善、守規矩；負＝狠辣、損人利己（事件選項累積）
//     穩躁：正＝冒進、好鬥；負＝謹慎、守成（事件選項與修練行動都會累積）
//
// 路線 mods（全部可省略，省略＝不影響）
//   cult            修練效率倍率（所有行動）
//   actionCult      各行動的修練效率倍率 { 吐納: 1.1, … }
//   demonPerSeason  每季額外心魔
//   demonFloor      心魔低於此值時不影響突破與小境界（魔修以心魔為力）
//   demonToCult     每點心魔增加的修練效率（魔修）
//   life            壽元倍率
//   injury          受傷機率倍率
//   deathIfInjured  帶傷再出事時致死機率的倍率
//   rootWeight      靈根影響的權重（1＝照常；0.4＝靈根好壞只剩四成影響，體修）
//   travelInsight   遊歷感悟倍率
//   tagBias         能力池各系倍率 { 劍: 4 }；路線專屬系別（如「魔」）只有在這裡出現才抽得到
//   deviation       走火入魔時的特殊處理（"魔修"＝放任魔性有機率身死，否則化為修為）
export const routesData = {
  tendency: {
    decay: 0.85,
    actStep: { 周天: 2, 遊歷: 1, 閉關: -1, 吐納: -1 },   // 修練行動對「穩躁」的影響
    clamp: 100,
    dominant: 3                                        // 某行動累積超過這個值，才算「習慣」
  },

  // 只屬於某條路線的能力系別（不在佈局 7 標籤裡）
  routeTags: ["魔"],

  routes: {
    "氣修": {
      name: "氣修", path: "正統修法",
      desc: "以靈根引天地靈氣，最常見的修法",
      mods: {}
    },
    "魔修": {
      name: "魔修", path: "魔道", technique: "天魔策",
      desc: "以心魔為力，進境快；心魔失控即遭反噬，正道視為仇敵。金丹以上才能墮入，之前只能累積邪修作派、種下魔種",
      mods: { cult: 1.2, demonPerSeason: 2, demonFloor: 70, demonToCult: 0.004, life: 0.9,
              tagBias: { 魔: 4, 心境: 0.5 }, deviation: "魔修" },
      deviationDeath: 0.4
    },
    "劍修": {
      name: "劍修", path: "劍道", technique: "太虛劍典",
      desc: "以劍入道，越在外歷練越強；防身薄弱，容易受傷",
      mods: { actionCult: { 周天: 1.15, 遊歷: 1.6, 吐納: 0.95, 閉關: 0.95 }, injury: 1.3, travelInsight: 1.5,
              tagBias: { 劍: 4, 金: 1.5 } }
    },
    "體修": {
      name: "體修", path: "煉體", technique: "九轉煉體訣",
      desc: "以身為爐，進境慢但耐打長壽，靈根好壞影響小",
      mods: { cult: 0.85, life: 1.25, injury: 0.5, deathIfInjured: 0.5, rootWeight: 0.4,
              tagBias: { 肉身: 4 } }
    }
  },

  // 稱號：由上往下找第一個符合的；都不符合就沿用少年印記
  titles: [
    { route: "魔修", when: t => t.正邪 <= -50, title: "魔頭" },
    { route: "魔修", title: "魔道中人" },
    { route: "劍修", when: t => t.穩躁 >= 40, title: "狂劍" },
    { route: "劍修", title: "劍客" },
    { route: "體修", title: "煉體的怪人" },
    { when: t => t.正邪 >= 50, title: "活菩薩" },
    { when: t => t.正邪 >= 25, title: "好心的修士" },
    { when: t => t.正邪 <= -50, title: "心狠手辣之人" },
    { when: t => t.正邪 <= -25, title: "不好惹的修士" },
    { when: t => t.habit === "閉關", title: "苦修士" },
    { when: t => t.habit === "遊歷", title: "遊方散修" },
    { when: t => t.穩躁 >= 40, title: "急性子" },
    { when: t => t.穩躁 <= -40, title: "老成持重的修士" }
  ]
};
