// 遊歷事件（資料驅動）。新增事件只要在 list 裡加一筆，不用改程式。
//
// 欄位說明：
//   id        唯一代號
//   title     標題
//   weight    抽中權重（預設 1）
//   once      true＝一輩子只發生一次
//   when(s)   出現條件，s 是遊戲狀態；回傳 true 才會進入抽選
//   text(s)   事件敘述（可以是字串或函式）
//   choices   選項陣列：{ label, show(s, api)?, run(s, api) → 結果文字 }
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
//   api.injure(seasons?)  受傷，不給季數＝一般受傷
//   api.probeDemonKing({ treatAsHealthy? })  冒險一探妖王：成功／重傷／身死與回報；回傳結果文字
//   api.demonKingClueCount()  目前算得上的妖王線索條數（本世＋前人筆記，最多 2）
//   api.demonKingFleeHurtChance(base)  遁走受傷機率扣掉線索效果後的值

import { numbers } from "./numbers.js";

export const eventsData = {
  // 妖王線索（冒險一探成功時三選一，寫進修仙筆記）
  demonKingClues: {
    習性: "妖王現身之前，林中鳥獸必先噤聲，腥風總是從下風處先到。",
    弱點: "妖王左目有一道舊傷，從牠左側繞行，牠察覺得最慢。",
    出沒季節: "妖王入冬便蟄伏不出，春夏之交最常下山覓食。"
  },
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
            return "道人留下一冊手抄心得便告辭。你讀完後，對下一道關口多了幾分把握。\n〔感悟 +60〕"; } }
      ]
    },
    {
      id: "妖獸襲擊", title: "妖獸襲擊", weight: 2,
      when: s => true,
      text: s => numbers.seasons[s.seasonIdx] === "夏" ? "夏季妖獸活躍，一頭獠牙妖狼從草叢撲出！" : "一頭獠牙妖狼從草叢撲出！",
      choices: [
        { label: "迎戰",
          run: (s, api) => {
            const win = api.chance(0.55 + s.realmIndex * 0.2);
            if (win) { api.addMaterial("妖獸內丹", 1); return "一番苦戰後你斬殺妖狼，取得妖獸內丹。"; }
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
            return `你只取了「${m}」，心境也平和了些。\n〔心魔 −5〕`; } }
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
      when: s => numbers.seasons[s.seasonIdx] === "夏",
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
            return "你在殘骸中翻找，殺氣侵入心神。此地可作為突破之所，你記下了它的位置。\n〔心魔 +10；解鎖：古戰場〕"; } },
        { label: "記下位置後離開", run: (s, api) => { api.unlockEnv("古戰場"); return "你記下了古戰場的位置，日後或許用得上。\n〔解鎖：古戰場〕"; } }
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
        { label: "加入論道", run: (s, api) => { api.addInsight(15); return "一番論道，各有所得。\n〔感悟 +15〕"; } },
        { label: "只在旁聽", run: (s, api) => { api.addInsight(5); return "你聽了半晌，略有所得。\n〔感悟 +5〕"; } }
      ]
    },
    {
      id: "心魔幻象", title: "心魔幻象", weight: 1,
      when: s => s.demon >= 30,
      text: "夜裡你夢見自己突破失敗、經脈寸斷。醒來時冷汗濕透了衣衫。",
      choices: [
        { label: "靜坐調息", run: (s, api) => { api.addDemon(-10); return "你靜坐到天明，心緒漸漸平復。\n〔心魔 −10〕"; } },
        { label: "強壓下去，繼續趕路", run: (s, api) => { api.addDemon(5); return "你壓下不安繼續上路，但那個夢揮之不去。\n〔心魔 +5〕"; } }
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
      // 不會被隨機抽到：遊歷中撞見妖王時由 travel.js 直接排入（11/08 定：妖王改成可讀徵兆、可以躲）
      id: "妖王徵兆", title: "妖氣逼近", weight: 0,
      when: s => false,
      text: s => "林中鳥獸忽然噤聲，一陣腥風撲面而來。遠處有一股遠勝於你的妖氣，正緩緩朝這邊移動。"
        + (s.injury > 0 ? "\n你身上的傷還隱隱作痛。真要逃，未必跑得掉。" : ""),
      choices: [
        { label: "立刻遁走",
          run: (s, api) => {
            const demonKingNumbers = numbers.risk.遊歷.demonKing;
            if (s.injury > 0) {
              if (api.chance(api.demonKingFleeHurtChance(demonKingNumbers.fleeFailIfInjured))) {
                api.injure(demonKingNumbers.heavyInjurySeasons);
                return "你拖著傷轉身就走，還是慢了一步。腥風從背後掃來，你被掀下山坡，筋骨欲裂，好不容易才爬回去。\n〔遁走失敗，重傷〕";
              }
              return "你咬牙忍著傷，頭也不回地遁走。身後的妖氣沒有追來。";
            }
            if (api.chance(api.demonKingFleeHurtChance(demonKingNumbers.fleeHurt))) {
              api.injure(demonKingNumbers.lightInjurySeasons);
              return "你當機立斷轉身遁走，慌亂中被斷枝劃破了手臂，所幸並無大礙。\n〔輕傷〕";
            }
            return "你當機立斷轉身遁走，一口氣奔出數十里才停下。身後的妖氣始終沒有追來。";
          } },
        { label: "冒險一探",
          run: (s, api) => api.probeDemonKing() },
        // 筆記裡的線索夠多（算滿 2 條）才看得出妖王會往哪裡走
        { label: "照筆記避開",
          show: (s, api) => api.demonKingClueCount() >= numbers.risk.遊歷.demonKing.cluesCountedMax,
          run: (s, api) => {
            if (api.chance(numbers.risk.遊歷.demonKing.avoidWithNotesHitChance)) {
              return "你照著筆記上記的，避開了妖王常走的路。沒想到牠今日偏偏換了方向，迎面撞個正著。\n" + api.probeDemonKing({ treatAsHealthy: true });
            }
            return "你想起筆記上記的妖王習性，繞開牠常走的山路。一路無事，也一路無獲。";
          } }
      ]
    },

    // ================= 作派：正邪機緣（墨淵 11/17，只在遊歷抽到；不寫筆記） =================
    // 正號：正＝正邪正值、邪＝負值；善＝善惡正值；躁＝穩躁正值、穩＝負值。
    // 「少量」的數字放在 numbers.js 的 conduct.encounters（TODO(衡天)）；標 TODO(墨淵) 的是規格沒給的結果文字，先用佔位
    {
      id: "試劍石", title: "試劍石", weight: 2,
      when: s => true,
      text: "山道邊有塊試劍石，石面上一道一道全是劍痕。幾個青雲門弟子輪流上去出劍，一個師兄朝你招手：「路過的道友也能上，照規矩報個名號就行。」",
      choices: [
        { label: "報上名號，行禮後出一劍", run: (s, api) => { api.tend("正邪", 10);
            return "師兄點點頭，把你的名字記在石邊的竹簡上：「往後到青雲門，說這個名字就行。」"; } },
        { label: "站在一旁，看他們的劍路", run: (s, api) => { api.tend("穩躁", -5); api.addInsight(numbers.conduct.encounters.smallInsight);
            return "看到第三個人，你才看出他們每一劍都留了半分。"; } },
        { label: "不上去，繼續趕路", run: (s, api) => "你朝他們點點頭，繼續趕路。" }   // TODO(墨淵)
      ]
    },
    {
      id: "代送一封信", title: "代送一封信", weight: 2,
      when: s => true,
      text: "驛站掌櫃攔住你：「青雲門的信差病倒了，有封信要送到山那頭的分堂。路上不太平，人家說給的酬勞不少。」",
      choices: [
        { label: "接下，照規矩送到", run: (s, api) => {
            const E = numbers.conduct.encounters;
            api.tend("正邪", 10);
            // 路上照機率遇劫：先鬥法，打不過再遁走（沿用妖獸襲擊的判定）；只有送到才有酬勞與分堂執事的恩
            if (api.chance(E.letterAmbushChance)) {
              if (!api.chance(E.fightBaseWinChance + s.realmIndex * E.fightWinPerRealm)) {
                if (api.chance(E.fleeChance)) return "半路有人攔路搶信。你打不過，只能護著自己脫身，信在混亂中丟了。";   // TODO(墨淵)
                api.injure(); return "半路有人攔路搶信。你沒能擋住，信被搶走，自己也受了傷。";   // TODO(墨淵)
              }
            }
            api.addStones(E.smallStones);
            api.addKarma("青雲分堂執事", "替青雲門送信到分堂", "小");
            return "信平安送到了分堂。執事收下信，付了酬勞，還記下了你的名字。";   // TODO(墨淵)
          } },
        { label: "接下，路上拆開看", run: (s, api) => { api.tend("穩躁", 5); api.addStones(numbers.conduct.encounters.smallStones);
            return "信裡只有一句：淵口的字，這個月再抹一次。\n你把信封好，照樣送到，照樣拿了酬勞。"; } },
        { label: "不接", run: (s, api) => "你搖搖頭，掌櫃只好去問下一個人。" }   // TODO(墨淵)
      ]
    },
    {
      id: "坊市執事", title: "坊市爭執", weight: 2,
      when: s => true,
      text: "坊市裡兩個散修為一株靈草吵了起來，手都按在了法器上。旁邊的攤主不看他們，都在看你，像在等一個管事的人。",
      choices: [
        { label: "照坊市規矩，請兩人把靈草交給執事評斷", run: (s, api) => { api.tend("正邪", 10);
            return "執事來了，兩人都不敢再吵。散場時執事看了你一眼：「你懂規矩。」"; } },
        { label: "出手制住先拔法器的那個", run: (s, api) => {
            const E = numbers.conduct.encounters;
            api.tend("正邪", 8);
            if (api.chance(E.fightBaseWinChance + s.realmIndex * E.fightWinPerRealm)) {
              api.addKarma("制住鬧事散修", "在坊市制住了先拔法器的散修", "小");
              return "你一掌按下他的法器。那人負傷離開，走前狠狠瞪了你一眼。";   // TODO(墨淵)
            }
            api.injure(); return "那人比你想的難纏，你挨了一下，兩人趁亂散了。";   // TODO(墨淵)
          } },
        { label: "自己掏靈石買下靈草，兩人各分一半", run: (s, api) => {
            api.tend("善惡", 5); api.addStones(-numbers.conduct.encounters.smallStones);
            api.addKarma("坊市散修甲", "替坊市兩個散修化解爭執（其一）", "小");
            api.addKarma("坊市散修乙", "替坊市兩個散修化解爭執（其二）", "小");
            return "你掏錢買下靈草，一人一半。兩個散修愣了半晌，各自向你拱了拱手。";   // TODO(墨淵)
          } }
      ]
    },
    {
      id: "無眼鶴", title: "無眼鶴", weight: 2,
      when: s => true,
      text: "酒肆裡一個散修坐到你對面，袖口繡著一隻沒有眼睛的鶴：「正道規矩多，修得快嗎？我們那裡不問出身，也不問來路。」他把一枚骨牌推到你面前。",
      choices: [
        { label: "收下骨牌，跟他走一趟", run: (s, api) => {
            api.tend("正邪", -12);
            api.addXiu(numbers.realms[s.realmIndex].perSeason * numbers.conduct.encounters.smallXiuSeasons);
            api.addKarma("無眼鶴旁門", "收下無眼鶴的骨牌，跟他走了一趟", "中");
            return "他帶你去的地方不問來歷，教的法子也不問對錯。這一季，你的修為多了一點。";   // TODO(墨淵)
          } },
        { label: "收下骨牌，什麼都不說", run: (s, api) => { api.tend("穩躁", -5);
            return "骨牌留在身上，夜裡偶爾會發燙。"; } },
        { label: "把骨牌推回去", run: (s, api) => { api.tend("正邪", 5);
            return "他笑了笑，收回骨牌：「路很長，你會再見到這隻鶴。」"; } }
      ]
    },
    {
      id: "血跡殘卷", title: "血跡殘卷", weight: 2,
      when: s => true,
      text: "你在亂石堆裡踢到一隻皮囊，裡面是半部功法，最後幾頁沾著乾掉的血。字寫得很好，練法卻是倒著走經脈。",
      choices: [
        { label: "照著練", run: (s, api) => {
            const E = numbers.conduct.encounters;
            api.tend("正邪", -12);
            api.addKarma("殘卷主人同門", "練了來路不明的血跡殘卷，被認定是你拿的", "中");
            // 規格寫「感悟或修為少量」：給感悟（瓶頸時直接加，平時先存著，到瓶頸再用），不另外加修為
            api.addInsight(E.smallInsight);
            return "倒走的經脈讓你冷汗直流，卻真的通了幾處。\n沒過多久，皮囊主人的同門找上了你，認定東西是你拿的。";   // TODO(墨淵)
          } },
        { label: "交給坊市執事", run: (s, api) => { api.tend("正邪", 8);
            return "執事翻了兩頁就把它鎖進櫃子：「這種東西，不該在外面。」"; } },
        { label: "一把火燒了", run: (s, api) => { api.tend("穩躁", -5);
            return "紙燒得很慢，血跡那幾頁最後才著。"; } }
      ]
    },
    {
      id: "截道", title: "截道", weight: 2,
      when: s => true,
      text: "一個旁門修士在路邊攔住你：「山下那支商隊帶著一車血玉。你替我拖住護衛，分你三成。」",
      choices: [
        { label: "動手", run: (s, api) => {
            const E = numbers.conduct.encounters;
            api.tend("正邪", -15);
            if (api.chance(E.fightBaseWinChance + s.realmIndex * E.fightWinPerRealm)) {
              api.addStones(E.raidStones);
              api.addKarma("截道商隊", "幫旁門修士截了商隊，傷了護衛", "中");
              return "你拖住了護衛。事成之後，旁門修士把三成血玉換成的靈石丟給你。護衛負了傷。";   // TODO(墨淵)
            }
            api.injure(); return "護衛比你想的強。你負傷退走，旁門修士早就不見了。";   // TODO(墨淵)
          } },
        { label: "只在遠處望風", run: (s, api) => {
            api.tend("正邪", -10); api.addStones(numbers.conduct.encounters.smallStones);
            api.addKarma("望風商隊", "替截道的旁門修士望風", "小");
            return "後來你聽說，那天有個護衛沒回家。"; } },
        { label: "轉頭去給商隊報信", run: (s, api) => {
            api.tend("正邪", 10);
            api.addKarma("截道旁門修士", "壞了旁門修士截道的事", "小");
            return "商隊聽了你的話，改走另一條路。"; } }   // TODO(墨淵)
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
