const scoreUtil = require("./score");

/**
 * 按 score.js 规则重算本条记录当时贡献的分值（与保存时 calcEatingScore+calcEatingOverwhelmMarginal 等一致），用于删除回滚。
 * AI 行仍用写入时的 scoreDelta。
 */
function computeRecordRevertDelta(item) {
  if (!item) return 0;
  if (item.recordKind === "aiSleep" || item.recordKind === "aiCalorie") {
    return Number(item.scoreDelta) || 0;
  }
  const mod = item.module;
  const payload = item.scorePayload || {};
  if (mod === "act") {
    if (
      payload.panel === "sit-overtime-panel" &&
      (payload.sitDailyTotalBefore == null || payload.sitDailyTotalBefore === "")
    ) {
      return Number(item.scoreDelta) || 0;
    }
    return scoreUtil.calcActScore(payload);
  }
  if (mod === "sleep") {
    return scoreUtil.calcSleepScore(payload);
  }
  if (mod === "eating") {
    const m = payload.selectedMap || {};
    const portionsNow = scoreUtil.getEatingPortionCountsToday();
    const beforePortions = {
      vegetable: Math.max(
        0,
        (Number(portionsNow.vegetable) || 0) - (m["vegetable-btn"] ? 1 : 0),
      ),
      fruit: Math.max(
        0,
        (Number(portionsNow.fruit) || 0) - (m["fruit-btn"] ? 1 : 0),
      ),
      protein: Math.max(
        0,
        (Number(portionsNow.protein) || 0) - (m["protein-btn"] ? 1 : 0),
      ),
    };
    const cNow = scoreUtil.getEatingCountsToday();
    const wineB =
      payload.wineCountToday != null
        ? Number(payload.wineCountToday)
        : Math.max(0, (Number(cNow.wine) || 0) - (m["drink-wine-btn"] ? 1 : 0));
    const milkB =
      payload.milkCountToday != null
        ? Number(payload.milkCountToday)
        : Math.max(0, (Number(cNow.milk) || 0) - (m["drink-milk-btn"] ? 1 : 0));
    const coffeeB =
      payload.coffeeCountToday != null
        ? Number(payload.coffeeCountToday)
        : Math.max(0, (Number(cNow.coffee) || 0) - (m["coffee-btn"] ? 1 : 0));
    return (
      scoreUtil.calcEatingScore({
        ...payload,
        wineCountToday: wineB,
        milkCountToday: milkB,
        coffeeCountToday: coffeeB,
      }) + scoreUtil.calcEatingOverwhelmMarginal(beforePortions, m)
    );
  }
  return Number(item.scoreDelta) || 0;
}

module.exports = { computeRecordRevertDelta };
