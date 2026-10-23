// 遊歷事件（資料驅動）。新增事件只要在 list 裡加一筆，不用改程式。
//
// 欄位說明：
//   id        唯一代號
//   title     標題
//   weight    抽中權重（預設 1）
//   once      true＝一輩子只發生一次
//   when(s)   出現條件，s 是遊戲狀態；回傳 true 才會進入抽選
//   text(s)   事件敘述（可以是字串或函式）
//   choices   選項陣列：{ label, show(s)?, run(s, api) → 結果文字 }
//
// api 提供的工具：
//   api.rand(a,b) 整數亂數；api.chance(p) 機率判定；api.pick(arr) 隨機挑一個
//   api.addStones(n)  api.addMaterial(name, n)  api.addArtifact(name)
//   api.addDemon(n)   api.addInsight(n)   api.addLife(years)   api.injure()
//   api.unlockEnv(name)   api.setFlag(k, v)   api.flag(k)
//   api.addKarma(id, text, weight)   api.hasKarma(id)   api.resolveKarma(id, ending)
//   api.note(text)    寫一頁修仙筆記
//   api.die(cause)    角色死亡
//   api.learnTechnique(name)
//   api.legacyPages()  取得前代留下的筆記頁；api.takeLegacy() 取走並生效

export const eventsData = {
  list: [
    {
      id: "山道老者", title: "山道上的老者", weight: 1, once: true,
      when: s => true,
      text: "山道旁倒著一位衣衫襤褸的老者，氣息微弱。附近林中隱約有獸吼。",
      choices: [
        { label: "停下來救他（耗費 5 靈石的丹藥）",
          show: s => s.stones >= 5,
          run: (s, api) => { api.addStones(-5); api.addKarma("救山道老者", "於山道救一老者", "中");
            api.note("於山道救一老者，他只說了句「好心有好報」便走了。"); return "老者服下丹藥，緩過一口氣。他深深看了你一眼，拄杖離去。"; } },
        { label: "繞路離開",
          run: (s, api) => { api.note("山道上遇一倒地老者，未停步。"); return "你加快腳步離開。身後很快安靜了下來。"; } }
      ]
    },
    {
      id: "老者報恩", title: "故人來訪", weight: 3, once: true,
      when: s => s.karma.some(k => k.id === "救山道老者") && s.realmIndex >= 1,
      text: "一位鶴髮童顏的道人立在你洞府前：「多年前山道上，承蒙小友一救。」",
      choices: [
        { label: "請他入內",
          run: (s, api) => { api.resolveKarma("救山道老者", "老者原是隱世高人，以一冊心得相贈");
            api.addInsight(60); api.note("當年山道所救老者竟是隱世高人，贈我心得一冊，瓶頸豁然開朗。");
            return "道人留下一冊手抄心得便告辭。你讀完後，對下一道關口多了幾分把握（感悟 +60）。"; } }
      ]
    },
    {
      id: "妖獸襲擊", title: "妖獸襲擊", weight: 2,
      when: s => true,
      text: s => s.season === "夏" ? "夏季妖獸活躍，一頭獠牙妖狼從草叢撲出！" : "一頭獠牙妖狼從草叢撲出！",
      choices: [
        { label: "迎戰",
          run: (s, api) => {
            const win = api.chance(0.55 + s.realmIndex * 0.2);
            if (win) { api.addMaterial("妖獸內丹", 1); api.addKarma("斬妖狼", "斬一頭妖狼", "小"); return "一番苦戰後你斬殺妖狼，取得妖獸內丹。"; }
            api.injure(); return "你不敵妖狼，負傷逃走（受傷，兩季內修為減半）。";
          } },
        { label: "以遁術脫身",
          run: (s, api) => api.chance(0.8) ? "你成功甩開了妖狼。" : (api.injure(), "沒能完全躲開，背上挨了一爪（受傷）。") }
      ]
    },
    {
      id: "採到靈草", title: "林間靈草", weight: 3,
      when: s => true,
      text: "林間有一處靈氣匯聚的窪地，長著幾株靈草。",
      choices: [
        { label: "小心採下",
          run: (s, api) => { const m = api.pick(["青木靈髓", "火靈芝", "玄水青蓮"]); api.addMaterial(m, 1); return `你採到了「${m}」。`; } },
        { label: "只取一半，留下根株",
          run: (s, api) => { const m = api.pick(["青木靈髓", "火靈芝"]); api.addMaterial(m, 1); api.addDemon(-5);
            return `你只取了「${m}」，心境也平和了些（心魔 −5）。`; } }
      ]
    },
    {
      id: "散修交易", title: "路遇散修", weight: 2,
      when: s => s.stones >= 20,
      text: "一名散修攔下你，神秘兮兮地打開布包：「道友，看看？二十靈石一樣。」",
      choices: [
        { label: "花 20 靈石買一樣",
          run: (s, api) => { api.addStones(-20); const m = api.pick(["雷擊木", "古劍殘片", "千年寒玉", "庚金之精", "息壤"]);
            api.addMaterial(m, 1); return `你買到了「${m}」。`; } },
        { label: "婉拒", run: () => "散修聳聳肩，轉身消失在人群裡。" }
      ]
    },
    {
      id: "雷雨夜", title: "雷雨夜", weight: 3, once: true,
      when: s => s.season === "夏",
      text: "夏夜雷雨大作，遠處山巔不斷有雷光落下，空氣中滿是躁動的雷息。",
      choices: [
        { label: "冒雨登上山巔",
          run: (s, api) => { api.unlockEnv("雷雨山巔"); if (api.chance(0.4)) api.addMaterial("雷擊木", 1);
            api.note("夏夜登山巔觀雷，記下此地。"); return "你在山巔看了一夜的雷。此地可作為突破之所（解鎖：雷雨山巔，僅夏季）。"; } },
        { label: "避雨，不冒險", run: () => "你在山洞裡聽了一夜雷聲。" }
      ]
    },
    {
      id: "古戰場遺跡", title: "古戰場", weight: 2, once: true,
      when: s => s.realmIndex >= 0,
      text: "荒原上遍地斷戟殘劍，陰風中似有嘶喊聲。",
      choices: [
        { label: "深入搜尋",
          run: (s, api) => { api.unlockEnv("古戰場"); api.addDemon(10);
            if (api.chance(0.6)) api.addMaterial("古劍殘片", 1);
            return "你在殘骸中翻找，殺氣侵入心神（心魔 +10）。此地可作為突破之所（解鎖：古戰場）。"; } },
        { label: "記下位置後離開", run: (s, api) => { api.unlockEnv("古戰場"); return "你記下了古戰場的位置（解鎖：古戰場）。"; } }
      ]
    },
    {
      id: "發現地火", title: "地火熔窟", weight: 2, once: true,
      when: s => true,
      text: "山腹中透出熱氣，裂縫深處是一片翻湧的地火。",
      choices: [{ label: "記下位置", run: (s, api) => { api.unlockEnv("地火熔窟"); return "解鎖突破地點：地火熔窟。"; } }]
    },
    {
      id: "發現金脈", title: "金脈礦洞", weight: 2, once: true,
      when: s => true,
      text: "一處廢棄礦洞，洞壁上金色的礦脈隱隱發光。",
      choices: [{ label: "記下位置", run: (s, api) => { api.unlockEnv("金脈礦洞"); if (api.chance(0.5)) api.addMaterial("庚金之精", 1);
        return "解鎖突破地點：金脈礦洞。"; } }]
    },
    {
      id: "發現裂谷", title: "大地裂谷", weight: 2, once: true,
      when: s => true,
      text: "大地在此裂開一道深谷，谷底的土氣厚重得幾乎凝成實質。",
      choices: [{ label: "記下位置", run: (s, api) => { api.unlockEnv("大地裂谷"); if (api.chance(0.5)) api.addMaterial("息壤", 1);
        return "解鎖突破地點：大地裂谷。"; } }]
    },
    {
      id: "同道論道", title: "同道論道", weight: 2,
      when: s => true,
      text: "茶館裡兩名修士正在爭論功法，見你駐足，邀你一同坐下。",
      choices: [
        { label: "加入論道", run: (s, api) => { api.addInsight(15); return "一番論道，各有所得（感悟 +15）。"; } },
        { label: "只在旁聽", run: (s, api) => { api.addInsight(5); return "你聽了半晌，略有所得（感悟 +5）。"; } }
      ]
    },
    {
      id: "心魔幻象", title: "心魔幻象", weight: 1,
      when: s => s.demon >= 30,
      text: "夜裡你夢見自己突破失敗、經脈寸斷。醒來時冷汗濕透了衣衫。",
      choices: [
        { label: "靜坐調息", run: (s, api) => { api.addDemon(-10); return "你靜坐到天明，心緒漸漸平復（心魔 −10）。"; } },
        { label: "強壓下去，繼續趕路", run: (s, api) => { api.addDemon(5); return "你壓下不安繼續上路，但那個夢揮之不去（心魔 +5）。"; } }
      ]
    },
    {
      id: "引雷訣殘卷", title: "雷紋殘卷", weight: 1, once: true,
      when: s => s.realmIndex >= 1,
      text: "一座倒塌的道觀裡，你在香爐灰下找到一卷刻滿雷紋的殘卷。",
      choices: [
        { label: "收下殘卷", run: (s, api) => { api.learnTechnique("引雷訣"); return "你得到功法「引雷訣」（金＋木）。可在狀態欄改為主修。"; } }
      ]
    },
    {
      id: "前人遺府", title: "前人遺府", weight: 4, once: true,
      when: s => s.legacyAvailable,
      text: "瀑布後藏著一座洞府，石門上刻著一個你從沒聽過、卻莫名熟悉的名字。",
      choices: [
        { label: "推門而入",
          run: (s, api) => { const pages = api.takeLegacy();
            return pages.length ? `洞府裡只有一張石桌，桌上放著幾頁泛黃的手札（取得前人筆記 ${pages.length} 頁）：\n` + pages.map(p => "・" + p.text).join("\n")
              : "洞府裡空無一物，只有灰塵。"; } }
      ]
    }
  ]
};
