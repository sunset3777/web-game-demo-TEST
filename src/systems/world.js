// 世界系統：不隨主角行動、自己隨時間推進的世事（目前只有秘境定期開啟、預告與消散）
// 實作計畫階段 1 的世界時鐘與年表會落在這裡；畫面與其他系統只透過這裡判斷秘境是否開著。
import { numbers } from "../data/numbers.js";
import { util } from "./state.js";

export const world = {
  // 世事變遷：秘境定期開啟，提前傳聞；錯過就沒了
  worldTick(s, out) {
    const S = numbers.secret, U = util;
    if (s.secretAt == null) s.secretAt = s.seasons + U.rand(S.every[0], S.every[1]);
    const left = s.secretAt - s.seasons;
    if (left === S.notice) out.push("坊間傳聞：西邊山裡的秘境，過些日子就要開了。");
    if (left === 0) out.push("西邊山裡霞光沖天，秘境開了。");
    if (left <= -S.window) { s.secretAt = s.seasons + U.rand(S.every[0], S.every[1]); out.push("秘境的霞光散了，入口重新隱沒在山霧裡。"); }
  },
  secretOpen(s) { const left = s.secretAt - s.seasons; return s.secretAt != null && left <= 0 && left > -numbers.secret.window; }
};
