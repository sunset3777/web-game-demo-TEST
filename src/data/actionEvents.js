// 各修練行動專屬的事件，以及路線的入門事件鏈。格式同 events.js，另外多了：
//   actions   哪些行動會觸發（吐納／周天／閉關／遊歷）；events.js 裡沒寫的預設只在遊歷出現
//   tend      心性偏好：{ 正邪: 1 } 表示越「正」越容易遇到，{ 正邪: -1 } 表示越「邪」越容易遇到（善惡、穩躁同理）
//   route     只在這條路線出現；routeNot：這條路線不會出現
//   weight    可以是數字，或 (s, api) => 數字（例如越邪越常出現的正道盤查）
// api 另外提供：api.tend("善惡"|"正邪"|"穩躁", 數值)  api.setRoute(路線)  api.addXiu(數值)  api.route()
//   作派用：api.queueEventNext(id)  api.setInspectionCooldown(平常|提早|延後)  api.seasonStones(季數)
//     api.duel(對手陣仗, 死因) → { won, died }  api.tryFlee(有無幫手)  api.settleKarma(id, 結局)  api.noteRecordOnce(文字)
import { numbers } from "./numbers.js";

const season = s => numbers.seasons[s.seasonIdx];
const friend = s => s.flags["青梅竹馬"];

// ---- 作派：盤查與仇家共用的小工具（規則判定透過 api 交給 routes.js） ----
// 這次找上門的仇：controller 排入仇家事件時，把那筆因果的 id 記在 flags.仇家目標
const currentGrudge = s => (s.karma || []).find(entry => entry.id === s.flags.仇家目標) || null;
// 賠罪的價錢：max(5 季閉關靈石, 身上靈石 30%)
const apologyPrice = (s, api) => Math.max(api.seasonStones(numbers.conduct.enemy.apologyMinSeasons), Math.ceil(s.stones * numbers.conduct.enemy.apologyStoneShare));
// 和執法堂鬥法：陣仗決定門檻（一人／多人＝帶幫手／多人有高手）；輸了照現行受傷或身死
function fightLawEnforcers(s, api) {
  const opponent = { 一人: "一人", 多人: "幫手", 多人有高手: "高手" }[s.flags.執法陣仗 || "一人"];
  const result = api.duel(opponent, "正道圍殺");
  if (result.won) {
    api.addKarma("青雲門執法堂", "擊退了青雲門執法堂的追緝", "中");
    return "令牌掉在地上，人已經退走了。";
  }
  if (result.died) return "令牌的光是最後一樣你看清的東西。天亮時，洞府外只剩一灘水跡。";
  return "你被打回洞府裡，禁制碎了一地。來的人沒有進來，只在門口留下一句：「下次就不是這樣了。」";
}
// 和仇家鬥法：大因果的仇家帶幫手；贏了接「仇家勝後」讓玩家決定怎麼收場
function fightGrudgeHolder(s, api) {
  const grudge = currentGrudge(s);
  const result = api.duel(grudge && grudge.weight === "大" ? "幫手" : "一人", "仇家尋仇");
  if (result.won) { api.queueEventNext("仇家勝後"); return "他的刀被你挑飛，插進路邊的土裡。"; }   // 後面直接接「仇家勝後」的開頭
  if (result.died) return "他的刀比你記得的快。最後你看見的，是他蹲下來，把你的眼睛闔上。";
  return "你倒在山道上，他沒有再補一刀，只蹲下來看了你一會兒：「這樣就夠了。」等你爬起來，他已經不在了。";   // 仇照舊留著
}

export const actionEvents = {
  list: [
    // ================= 吐納：人在世間 =================
    { id: "鄰家求藥", title: "鄰家的孩子", actions: ["吐納"], weight: 2, tend: { 善惡: 1 },
      when: s => s.stones >= 3,
      text: "隔壁的孩子燒了三天，大人跪在你門口，求你給點仙家的藥。",
      choices: [
        { label: "拿出靈石換來的丹藥", run: (s, api) => { api.addStones(-3); api.tend("善惡", 6); api.addKarma("鄰家孩子", "救了鄰家的孩子", "小"); return "孩子的燒退了。那家人逢人便說，鎮上住著一位好心的仙師。"; } },
        { label: "推說自己也沒有", run: (s, api) => { api.tend("善惡", -3); return "你關上門。夜裡，隔壁的哭聲斷斷續續，一直到天亮。"; } }
      ] },
    { id: "市集騙子", title: "市集上的假藥", actions: ["吐納"], weight: 2,
      when: s => true,
      text: "市集上有人吆喝著賣「築基仙丹」，一顆十兩銀子，圍觀的鄉民擠得水洩不通。你一眼就看出那只是糖丸。",
      choices: [
        { label: "當眾拆穿", run: (s, api) => { api.tend("善惡", 2); api.tend("正邪", numbers.conduct.choiceShift.當眾拆穿正邪); api.tend("穩躁", 4);
            if (api.chance(0.3)) { api.addKarma("假藥販子", "拆穿了市集的假藥販子", "小"); return "鄉民一哄而散。那人臨走前狠狠瞪了你一眼。"; }
            return "鄉民一哄而散，那人灰溜溜地收了攤。"; } },
        { label: "與我無關", run: (s, api) => { api.tend("穩躁", -2); return "你搖搖頭走開了。修行的人，少管閒事。"; } },
        { label: "找他分一杯羹", run: (s, api) => { api.tend("善惡", -6); api.addStones(4); return "你在旁邊幫腔了幾句，那人散攤後塞給你幾塊碎靈石。"; } }
      ] },
    { id: "地痞收錢", title: "上門的地痞", actions: ["吐納"], weight: 1,
      when: s => s.stones >= 4,
      text: "幾個地痞堵在門口，說這條街歸他們管，要你交「平安錢」。",
      choices: [
        { label: "破財消災", run: (s, api) => { api.addStones(-3); api.tend("穩躁", -3); return "你給了錢。他們嘻嘻哈哈地走了，說下個月再來。"; } },
        { label: "教訓他們", run: (s, api) => { api.tend("穩躁", 5); api.tend("正邪", 1);
            if (api.chance(0.25)) { api.injure(); return "你把他們打跑了，但其中一個掏出了刀子，你手臂挨了一下。"; }
            return "三兩下就把他們打得抱頭鼠竄。街坊從窗縫裡偷看，沒人敢出聲。"; } }
      ] },
    { id: "雨夜借宿", title: "雨夜的旅人", actions: ["吐納"], weight: 1, tend: { 善惡: 1 },
      when: s => true,
      text: s => `${season(s)}夜大雨，一個渾身濕透的旅人敲門，想借住一晚。`,
      choices: [
        { label: "收留他", run: (s, api) => { api.tend("善惡", 4);
            if (api.chance(0.3)) { const lost = Math.min(s.stones, api.rand(2, 6)); api.addStones(-lost); return "第二天醒來，旅人不見了，你的錢袋也輕了一些。"; }
            api.addMaterial(api.pick(["青木靈髓", "庚金之精", "妖獸內丹"]), 1); return "天亮時旅人已經走了，桌上留了一樣東西，算是謝禮。"; } },
        { label: "隔著門回絕", run: (s, api) => { api.tend("穩躁", -2); return "腳步聲在雨裡慢慢走遠了。"; } }
      ] },
    { id: "富戶求法", title: "富戶求仙緣", actions: ["吐納"], weight: 1, once: true,
      when: s => s.realmIndex >= 1,
      text: "鎮上的富戶帶著一箱靈石登門，求你傳他兒子幾手仙法。那孩子一點靈根也沒有。",
      choices: [
        { label: "收錢，教些粗淺的吐納", run: (s, api) => { api.addStones(15); api.tend("善惡", -3); return "那孩子學了一年，除了氣色好些，什麼也沒學會。富戶倒是很滿意。"; } },
        { label: "實話實說，婉拒", run: (s, api) => { api.tend("善惡", 3); return "富戶失望地走了。那孩子回頭看了你一眼，眼裡有些不甘。"; } }
      ] },
    { id: "故人老去", title: "故人", actions: ["吐納"], weight: 3, once: true,
      when: s => !!friend(s) && s.realmIndex >= 1,
      text: s => `你回到青石鎮，在巷口遇見了${friend(s)}。當年跟在你身後的孩子，如今鬢角已經白了，手裡牽著一個小孫子。`,
      choices: [
        { label: "上前相認", run: (s, api) => { api.addDemon(-10); api.note(`回青石鎮見到${friend(s)}，他已兒孫滿堂。我還是當年的模樣。`); return `${friend(s)}愣了很久，才喊出你的名字。那晚你們喝了很多酒，他說了很多你不在的年月。`; } },
        { label: "遠遠看著，轉身離開", run: (s, api) => { api.addInsight(15); api.note(`在青石鎮遠遠看見${friend(s)}，終究沒有上前。`); return "你站在巷口看了很久。修行的路，越走越長，身後的人越來越少。"; } }
      ] },
    { id: "說書新段", title: "茶館說書", actions: ["吐納"], weight: 1,
      when: s => true,
      text: "茶館裡的說書人換了新段子，講的是百年前一位散修獨闖秘境的故事。",
      choices: [{ label: "聽到最後", run: (s, api) => { api.addInsight(5); return "故事裡的散修最後死在了秘境深處。你想了很久，覺得他死得不冤。"; } }] },

    // ================= 周天：體內的變化 =================
    { id: "經脈刺痛", title: "經脈刺痛", actions: ["周天"], weight: 2,
      when: s => s.demon >= 10,
      text: "運到第七個周天時，任脈一陣刺痛，像有細針在裡面游走。",
      choices: [
        { label: "停下來調息", run: (s, api) => { api.tend("穩躁", -3); api.addDemon(-5); return "你緩緩收功。刺痛退去了，心也跟著靜下來。"; } },
        { label: "咬牙衝過去", run: (s, api) => { api.tend("穩躁", 4);
            if (api.chance(0.35)) { api.injure(); return "刺痛猛地炸開，你一口血噴在蒲團上。"; }
            api.addXiu(numbers.realms[s.realmIndex].perSeason); return "刺痛過後，經脈像被撐寬了一圈，靈氣奔流得更快了。"; } }
      ] },
    { id: "靈氣倒灌", title: "靈氣倒灌", actions: ["周天"], weight: 2,
      when: s => true,
      text: "周天運轉越來越快，四周的靈氣忽然一股腦湧進丹田，多到你快壓不住。",
      choices: [
        { label: "全部吞下", run: (s, api) => { api.tend("穩躁", 4);
            if (api.chance(0.5)) { api.addXiu(numbers.realms[s.realmIndex].perSeason * 2); return "你硬生生把靈氣煉化了，丹田脹得發疼，修為卻漲了一大截。"; }
            api.injure(); api.addDemon(5); return "靈氣在經脈裡橫衝直撞，你壓不住，受了內傷。"; } },
        { label: "引導它散去", run: (s, api) => { api.tend("穩躁", -3); return "你慢慢把多餘的靈氣導出體外。可惜，但穩妥。"; } }
      ] },
    { id: "心火上湧", title: "心火", actions: ["周天"], weight: 2, tend: { 穩躁: 1 },
      when: s => true,
      text: "越運功越煩躁，一股無名火從心底竄上來，靈力卻也跟著旺了起來。",
      choices: [
        { label: "借這股火勢衝功", run: (s, api) => { api.tend("穩躁", 4); api.addDemon(8); api.addXiu(numbers.realms[s.realmIndex].perSeason * 1.5); return "你借著心火一路衝了上去。功力漲了，心卻更亂了。"; } },
        { label: "壓下心火", run: (s, api) => { api.tend("穩躁", -3); api.addDemon(-3); return "你默念清心訣，把火一點一點壓了回去。"; } }
      ] },
    { id: "頓悟一線", title: "靈光", actions: ["周天", "閉關"], weight: 1,
      when: s => true,
      text: "某個周天轉到一半，你忽然明白了一處以前怎麼也想不通的關竅。",
      choices: [{ label: "記下來", run: (s, api) => { api.addInsight(12); api.note("運功時忽有所悟，記下一處關竅。"); return "你連夜把這點體會寫進了筆記。"; } }] },

    // ================= 閉關：靜中所見 =================
    { id: "心魔低語", title: "心魔低語", actions: ["閉關"], weight: 2,
      when: s => s.demon >= 25,
      text: "靜坐到深處，耳邊響起一個很像你自己的聲音：「何必那麼辛苦？你想要的，我都能給你。」",
      choices: [
        { label: "聽它說下去", run: (s, api) => { api.tend("正邪", -4); api.addDemon(6); api.addInsight(15); return "它說了很多，有些話竟然很有道理。你醒來時一身冷汗。"; } },
        { label: "默誦清心訣", run: (s, api) => { api.tend("穩躁", -2); api.tend("正邪", 4); api.addDemon(-8); return "聲音漸漸遠了。洞府裡只剩下你的呼吸聲。"; } }
      ] },
    { id: "前塵舊夢", title: "舊夢", actions: ["閉關"], weight: 2,
      when: s => !!s.mark,
      text: s => `入定時，你夢見自己還是那個${s.mark}，在青石鎮的${season(s)}天裡，什麼都不用想。`,
      choices: [{ label: "醒來", run: (s, api) => { api.addDemon(-5); return "醒來時，嘴角還帶著笑。"; } }] },
    { id: "洞外動靜", title: "洞外的動靜", actions: ["閉關"], weight: 2,
      when: s => true,
      text: "洞府外傳來窸窸窣窣的聲音，像有什麼東西在扒你的石門。",
      choices: [
        { label: "出去看看", run: (s, api) => { api.tend("穩躁", 3);
            if (api.chance(0.5)) { api.addMaterial("妖獸內丹", 1); return "是一頭餓瘋了的妖狐。你打發了牠，還取了一顆內丹。"; }
            api.injure(); return "外頭不只一頭。你被抓傷了，好不容易才退回洞裡。"; } },
        { label: "加固石門，不理它", run: (s, api) => { api.tend("穩躁", -3); return "聲音持續了三天，然後消失了。"; } }
      ] },
    { id: "石壁劍痕", title: "石壁上的劍痕", actions: ["閉關"], weight: 1, once: true,
      when: s => true,
      text: "閉關的石壁上有一道很淺的劍痕，你以前從沒注意過。盯著它看久了，竟覺得眼睛刺痛。",
      choices: [
        { label: "日夜參悟", run: (s, api) => { api.setFlag("劍意"); api.tend("穩躁", 2); api.note("洞府石壁上有一道劍痕，似有劍意殘留。"); return "你看了它整整一季。閉上眼，那道劍痕還在眼前。"; } },
        { label: "拿東西遮住", run: (s, api) => { api.tend("穩躁", -2); return "你用一塊布把它蓋住了。眼睛不疼了。"; } }
      ] },

    // ================= 遊歷：外面的世界（補充）=================
    { id: "被欺凌的散修", title: "林中爭執", actions: ["遊歷"], weight: 2,
      when: s => true,
      text: "林子裡，三個宗門弟子圍著一個受傷的散修，要他交出剛採到的靈草。",
      choices: [
        { label: "出手相救", run: (s, api) => { api.tend("善惡", 6); api.tend("正邪", numbers.conduct.choiceShift.出手相救正邪); api.tend("穩躁", 3);
            if (api.chance(0.4)) { api.injure(); api.addKarma("得罪宗門弟子", "為救散修得罪了宗門弟子", "中"); return "你救下了散修，自己也掛了彩。那幾個弟子撂下狠話走了。"; }
            api.addKarma("救下散修", "林中救下一位散修", "小"); return "那幾個弟子見你不好惹，罵罵咧咧地走了。散修千恩萬謝。"; } },
        { label: "趁亂把靈草搶走", run: (s, api) => { api.tend("善惡", -10); api.tend("穩躁", 3); api.addKarma("搶散修靈草", "趁亂搶走受欺凌散修的靈草", "中"); api.addMaterial("青木靈髓", 1); return "你搶了靈草就跑，身後兩撥人都在罵你。"; } },
        { label: "繞道而行", run: (s, api) => { api.tend("穩躁", -2); return "你繞開了那片林子。"; } }
      ] },
    { id: "黑市", title: "黑市", actions: ["遊歷"], weight: 2, tend: { 正邪: -1 },
      // 拆軸後只看正邪會讓邪路走不通（11/17 衡天模擬），所以作惡夠多（善惡 ≤ darkPathOpensAtGoodEvil）也會被帶進來
      when: s => s.tend && (s.tend.正邪 <= -20 || s.tend.善惡 <= numbers.conduct.darkPathOpensAtGoodEvil) && s.stones >= 10,
      text: "你被帶進一處地下黑市。攤上擺著來路不明的丹藥，據說吃了能一夜漲十年功力。",
      choices: [
        { label: "買一顆", run: (s, api) => { api.addStones(-10); api.tend("正邪", -15); api.tend("善惡", -5); api.addDemon(12); api.addXiu(numbers.realms[s.realmIndex].perSeason * 3); return "藥力像火一樣燒遍全身。功力漲了，心底卻多了點說不清的東西。"; } },
        { label: "看看就走", run: (s, api) => { api.tend("穩躁", -2); api.tend("正邪", 5); return "你在黑市裡轉了一圈，記下了入口的位置。"; } }
      ] },
    { id: "宗門指點", title: "宗門長老", actions: ["遊歷"], weight: 2, tend: { 善惡: 1 },
      // 一世最多出現 numbers.conduct.sectGuidanceMaxPerLife 次，免得行善的人被同一位長老反覆指點
      when: s => s.tend && s.tend.善惡 >= 20 && (s.flags["宗門指點次數"] || 0) < numbers.conduct.sectGuidanceMaxPerLife,
      text: "一位宗門長老聽說了你行善的事，特地在山腳等你，要指點你幾句。",
      choices: [{ label: "恭敬請教", run: (s, api) => { api.addInsight(25); api.tend("正邪", 3); api.setFlag("宗門指點次數", (api.flag("宗門指點次數") || 0) + 1); return "長老說了半個時辰，有幾句話讓你茅塞頓開。"; } }] },

    // ================= 路線入門：魔修 =================
    { id: "魔音入耳", title: "魔音", actions: ["周天", "閉關"], weight: 4, once: true, routeNot: "魔修",
      when: s => s.route === "氣修" && !s.flags["魔種"] && s.demon >= 40 && s.tend && (s.tend.正邪 <= -10 || s.tend.善惡 <= numbers.conduct.darkPathOpensAtGoodEvil),   // 種下魔種：任何境界都可能（累積邪修作派）
      text: "心魔不再只是低語。它清清楚楚地對你說：「你壓著我，只會越來越累。讓我進來，我給你力量。」",
      choices: [
        { label: "讓它進來", run: (s, api) => { api.setFlag("魔種"); api.tend("正邪", -12); api.addDemon(10); api.note("心魔在我心底種下了一顆種子。"); return "一股冰涼的東西沉進了你的丹田。不痛，甚至有點舒服。"; } },
        { label: "斬斷雜念", run: (s, api) => { api.tend("穩躁", -3); api.tend("正邪", 6); api.addDemon(-15); return "你咬破舌尖，用疼痛把那個聲音趕了出去。"; } }
      ] },
    { id: "魔種萌芽", title: "魔種", actions: ["周天", "閉關", "吐納"], weight: 5, once: true, routeNot: "魔修",
      when: s => s.route === "氣修" && s.flags["魔種"] && s.realmIndex >= 2 && s.tend && s.tend.正邪 <= -30,   // 墮入魔道：金丹以上，且作派夠邪
      text: "結丹之後，心底那顆沉睡多年的種子終於發芽了。這些年你做過的事，它都記得。它在等你做決定：順著它，或者把它連根拔起。",
      choices: [
        { label: "順著它，改修魔功", run: (s, api) => { api.setRoute("魔修"); api.tend("正邪", -15); api.note("我放棄了正統功法，改修《天魔策》。"); return "黑氣從丹田湧出，流遍全身。你從未覺得自己這麼強過。\n從今往後，心魔不再是敵人。"; } },
        { label: "以心火焚之", run: (s, api) => { api.setFlag("魔種", false); api.addDemon(-25); api.injure(); api.tend("正邪", 5); return "你點燃心火，硬生生把魔種燒成灰。經脈受了重創，但心裡乾淨了。"; } }
      ] },
    { id: "正道追殺", title: "正道修士", actions: ["遊歷", "吐納"], weight: 3, route: "魔修",
      when: s => true,
      text: "幾個正道修士攔住了你的去路：「魔頭，今日便替天行道！」",
      choices: [
        { label: "殺出一條路", run: (s, api) => { api.tend("穩躁", 4); api.tend("正邪", -4); api.tend("善惡", -3); api.addKarma("殺傷正道修士", "殺出正道修士的圍堵", "中");
            if (s.injury > 0 && api.chance(0.35)) { api.die("正道圍殺"); return "你本就帶傷，終究沒能殺出去。"; }
            if (api.chance(0.5)) { api.addDemon(8); api.addXiu(numbers.realms[s.realmIndex].perSeason); return "你殺了他們。魔功吸了血氣，又漲了幾分。"; }
            api.injure(); return "你殺出了包圍，自己也受了傷。"; } },
        { label: "丟下靈石，趁亂逃走", run: (s, api) => { api.addStones(-Math.ceil(s.stones / 2)); api.tend("穩躁", -2); return "靈石撒了一地。趁他們分神，你遁入了夜色。"; } }
      ] },

    // ================= 作派：正道盤查、仇家（墨淵定稿、衡天數字 11/17） =================
    // 這幾則都不會被隨機抽到（when 一律 false），由 controller 依作派與因果排入；規則在 routes.js，數字在 numbers.js 的 conduct。
    // 盤查三種：一般是「正道盤查」（山道照鏡）；因果帳有「恩」時「故人傳話」優先；正邪 ≤ -60 或照鏡被認出改「執法追緝」
    { id: "正道盤查", title: "山道照鏡", weight: 0, when: s => false,
      text: "兩名執法弟子攔在山道上。為首的那人手捧一面銅鏡，鏡面霧濛濛的，正對著你。「例行查問。道友從何處來，往何處去？」",
      choices: [
        { label: "站著讓他照", run: (s, api) => {
            api.tend("穩躁", -5);
            if (s.tend.正邪 <= numbers.conduct.inspection.recognizedAt) {
              api.queueEventNext("執法追緝");
              return "鏡面整個黑了。執法弟子退了一步，手按上劍柄。";
            }
            return "鏡面浮起一縷黑氣，又散了。執法弟子在冊子上記了一筆，側身讓路。"; } },
        { label: "編一套來歷", run: (s, api) => {
            api.tend("穩躁", 5);
            if (api.chance(api.storyPassChance())) return "他聽完點點頭，收起了鏡子。";
            api.setInspectionCooldown("提早");
            return "他沒說話，只在冊子上寫了你的名字。"; } },
        { label: "遞上一袋靈石，說是香火錢",
          show: (s, api) => s.stones >= api.seasonStones(numbers.conduct.inspection.bribeSeasons),
          run: (s, api) => { api.addStones(-api.seasonStones(numbers.conduct.inspection.bribeSeasons));
            return "他掂了掂袋子，鏡子沒有舉起來。"; } },
        { label: "轉身就走", run: (s, api) => {
            api.tend("穩躁", 10); api.setInspectionCooldown("提早");
            return "身後傳來一聲短哨，山那頭有人應了一聲。"; } }
      ] },
    { id: "故人傳話", title: "故人傳話", weight: 0, when: s => false,
      // 〔恩類因果對象〕：因果帳最早一筆未了結的「恩」（排入時記在 flags.傳話恩），顯示那筆因果的描述
      text: (s) => {
        const benefactor = (s.karma || []).find(entry => entry.id === s.flags.傳話恩);
        return `一隻紙鶴落在你肩上，是當年「${benefactor ? benefactor.text : "那段舊緣"}」那人的字跡：「青雲門在打聽你。我替你說了幾句話，下次未必說得上。」`;
      },
      choices: [
        { label: "回信道謝", run: (s, api) => { api.tend("善惡", 5);
            return "你回了一隻紙鶴，只寫了「多謝」兩個字。過了幾天，青雲門的人沒有來。"; } },
        { label: "請他別再插手", run: (s, api) => {
            api.tend("穩躁", -5); api.setFlag("盤查下季", true);   // 盤查照常：下一次行動就會遇上山道照鏡
            return "你把紙鶴摺回去，只寫了一句：「不必。」"; } },
        { label: "把紙鶴燒了", run: (s, api) => {
            api.tend("善惡", -5); api.settleKarma(s.flags.傳話恩, "燒了故人傳來的紙鶴");
            return "紙燒得很快。"; } }
      ] },
    { id: "執法追緝", title: "執法追緝", weight: 0, when: s => false,
      // 陣仗（排入時記在 flags.執法陣仗）：一人／多人／多人有高手；線索句與實際鬥法門檻一致，高手那句只有神識高才看得到
      text: (s, api) => {
        const squad = s.flags.執法陣仗 || "一人";
        const clue = squad === "一人" ? "門外只有一個人的腳步。" : "門外有三四道呼吸，排得很整齊。"
          + (squad === "多人有高手" && api.hasKeenSense() ? "其中一道很輕，比其他人都穩。" : "");
        return "夜裡，洞府外的禁制被人一層一層解開。來的人不說話，只亮了一面令牌：青雲門執法堂。\n" + clue;
      },
      choices: [
        { label: "迎戰", run: (s, api) => { api.tend("穩躁", 5); api.noteRecordOnce("曾被青雲門執法堂追緝"); return fightLawEnforcers(s, api); } },
        { label: "破陣遁走", run: (s, api) => {
            api.tend("穩躁", -5); api.noteRecordOnce("曾被青雲門執法堂追緝");
            if (!api.tryFlee((s.flags.執法陣仗 || "一人") !== "一人")) return "路被截住了。你只能回頭。\n" + fightLawEnforcers(s, api);
            // 「洞府這一季不能用」較難做，改成失去一季閉關的靈石（衡天 11/17 允許的替代）
            api.addStones(-api.seasonStones(1));
            return "你從洞府後面的山縫鑽出去，留下的靈石來不及帶。天亮時，你已經在百里之外。"; } },
        { label: "束手就擒", run: (s, api) => {
            api.tend("正邪", 5); api.noteRecordOnce("曾被青雲門執法堂追緝");
            api.addLife(-0.25);                                   // 關了一整季：多過一季
            api.addStones(-Math.floor(s.stones / 2));
            api.setInspectionCooldown("延後");
            // 機制照舊：多過一季壽元、靈石減半、下一次盤查延後
            return "他們把你帶到執法堂，關了一整季。放出來時，外面已經換了季節。"; } }
      ] },
    // 仇家：遊歷時依未了結的「仇」類中、大因果擲（controller 排入，對象記在 flags.仇家目標）；大因果的仇家帶幫手
    { id: "仇家尋仇", title: "仇家", weight: 0, when: s => false,
      text: (s, api) => {
        const grudge = currentGrudge(s);
        const hasHelpers = grudge && grudge.weight === "大";
        const opening = hasHelpers
          ? "你走到半路，前後的鳥聲同時停了。前面站著一個人，後面也站著一個人。前面那個說：「找你很久了。」"
          : `山道拐角站著一個人，你一時沒認出來。他先開口：「${grudge ? grudge.text : "那件事"}——還記得嗎？」`;
        if (!api.hasKeenSense()) return opening;
        return opening + "\n" + (hasHelpers ? "林子裡還有人，你數不清有幾個。" : "他握刀的手在抖，不是怕，是等太久了。");
      },
      choices: [
        { label: "迎戰", run: (s, api) => { api.tend("穩躁", 5); return fightGrudgeHolder(s, api); } },
        { label: "遁走", run: (s, api) => {
            api.tend("穩躁", -5);
            const grudge = currentGrudge(s);
            if (!api.tryFlee(!!grudge && grudge.weight === "大")) return "路被截住了。你只能回頭。\n" + fightGrudgeHolder(s, api);
            return "你一路沒有回頭，跑到天黑才停下。"; } },
        { label: "賠罪了結",
          // 只限中因果；要付 max(5 季閉關靈石, 身上靈石 30%)，不夠就不顯示
          show: (s, api) => { const grudge = currentGrudge(s); return !!grudge && grudge.weight === "中" && s.stones >= apologyPrice(s, api); },
          run: (s, api) => {
            api.tend("善惡", 5); api.addStones(-apologyPrice(s, api));
            api.settleKarma(s.flags.仇家目標, "賠罪了結");
            return "他收下了，看了你很久：「這件事，到這裡為止。」"; } }
      ] },
    { id: "仇家勝後", title: "仇家", weight: 0, when: s => false,
      text: "他跪在地上，手裡已經沒有刀，抬頭看你，等你決定。",
      choices: [
        { label: "放他走", run: (s, api) => { api.tend("善惡", 5);
            return "他撐著站起來，什麼也沒說就走了。"; } },
        { label: "斬草除根", run: (s, api) => {
            api.tend("善惡", -10);
            const grudge = currentGrudge(s);
            api.settleKarma(s.flags.仇家目標, "斬草除根");
            // 他的同門記你一筆新的中因果・仇（動態產生，直接給種類）
            api.addKarma(`${s.flags.仇家目標}的同門`, `斬草除根，結下「${grudge ? grudge.text : "舊仇"}」那人同門的仇`, "中", "仇");
            return "山道上安靜下來。"; } }
      ] },

    // ================= 路線入門：劍修 =================
    { id: "劍冢", title: "劍冢", actions: ["遊歷"], weight: 4, once: true, routeNot: "劍修",
      when: s => s.route === "氣修" && (s.flags["劍意"] || (s.root && s.root.fusion === "劍") || s.materials["古劍殘片"] || (s.tend && s.tend.穩躁 >= 30)),
      text: "山谷深處插滿了殘劍，密密麻麻，一眼望不到頭。風吹過時，萬劍齊鳴。",
      choices: [
        { label: "走進去", run: (s, api) => { api.tend("穩躁", 4);
            if (api.chance(0.6)) { api.setFlag("劍冢試煉"); api.note("闖入一處劍冢，有一柄劍在等我。"); return "你走到劍冢最深處。有一柄劍沒有生鏽，劍身微微顫動，像在認人。"; }
            api.injure(); return "劍氣割得你遍體鱗傷，你只走到一半就退了出來。"; } },
        { label: "在外頭拜一拜就走", run: (s, api) => { api.tend("穩躁", -2); return "你朝劍冢拜了三拜。風停了，劍也不鳴了。"; } }
      ] },
    { id: "劍意試煉", title: "那柄劍", actions: ["遊歷", "閉關"], weight: 5, once: true, routeNot: "劍修",
      when: s => s.route === "氣修" && s.flags["劍冢試煉"],
      text: "那柄劍一直在你夢裡。你知道，只要拔出它，就再也回不了頭。",
      choices: [
        { label: "拔劍", run: (s, api) => { api.setRoute("劍修"); api.note("拔出劍冢裡的那柄劍，從此以劍入道，改修《太虛劍典》。"); return "劍出鞘的那一刻，你聽見它在笑。\n從今往後，你是個劍修了。"; } },
        { label: "把它留在劍冢", run: (s, api) => { api.setFlag("劍冢試煉", false); api.tend("穩躁", -3); return "你把劍插回原處。它沉默了很久，終於不再呼喚你。"; } }
      ] },

    // ================= 路線入門：體修 =================
    { id: "煉體殘卷", title: "煉體殘卷", actions: ["遊歷", "吐納"], weight: 4, once: true, routeNot: "體修",
      when: s => s.route === "氣修" && (s.mark === "武童" || (s.constitutions || []).some(c => c.label === "肉身") || (s.tend && s.tend.act.遊歷 + s.tend.act.周天 >= 5)),
      text: "你在一間破廟的佛像底下，找到一卷被蟲蛀了大半的獸皮，上面畫著一個個赤身運氣的小人。",
      choices: [
        { label: "照著練", run: (s, api) => { api.setFlag("煉體"); api.tend("穩躁", 2); api.note("在破廟得到一卷煉體古法。"); return "練了一季，渾身骨頭像被拆開又裝回去。痛，但很踏實。"; } },
        { label: "收起來不管", run: (s, api) => { return "你把獸皮捲起來塞進行囊，之後再也沒打開過。"; } }
      ] },
    { id: "以身為爐", title: "以身為爐", actions: ["遊歷", "周天", "吐納"], weight: 5, once: true, routeNot: "體修",
      when: s => s.route === "氣修" && s.flags["煉體"],
      text: "殘卷最後一頁寫著：「以身為爐，以血為火，不假外物。」再往下練，就得散去一半的靈力，把它全煉進血肉裡。",
      choices: [
        { label: "散功煉體", run: (s, api) => { api.addXiu(-s.xiu * 0.5); api.setRoute("體修"); api.note("散去一半靈力，改修《九轉煉體訣》，以身為爐。"); return "你散去靈力的那一刻，渾身像被千刀萬剮。等痛過去，你一拳打碎了洞府的石桌。\n從今往後，你修的是這副身體。"; } },
        { label: "不值得", run: (s, api) => { api.setFlag("煉體", false); return "你把殘卷燒了。有些路，走了就回不了頭。"; } }
      ] }
  ]
};
