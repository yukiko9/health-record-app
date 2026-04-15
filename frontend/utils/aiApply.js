const scoreUtil = require("./score");

function decimalHoursToSleepParts(hours) {
  const totalMin = Math.round((Number(hours) || 0) * (60 / 30)) * 30;
  const t = Math.max(0, Math.min(24 * 60, totalMin));
  return {
    sleepHour: Math.floor(t / 60),
    sleepHalfHour: t % 60 >= 30 ? 30 : 0
  };
}

/**
 * 按 ai-analyze-logic：用最终 sleepHour（小时，可小数）、calorie 更新全局分与模块分。
 * 最近列表由调用方用 api.prependAiAnalyzeToRecentList 写入（不入库 high-rate）。
 */
function applyAiAnalyzeToApp(app, finalSleepHour, finalCalorie) {
  const calorie = Number(finalCalorie) || 0;
  const heatScore = Math.min(20, 20 * (1 - Math.exp(-calorie / 1000)));

  const actWas = Number(app.globalData.moduleScore.act) || 0;
  let v = typeof app.globalData.scoreValue === "number" ? app.globalData.scoreValue : 60;
  v = v - actWas + heatScore;
  app.globalData.moduleScore.act = heatScore;

  const key = scoreUtil.localDateKey();
  const nightStore = wx.getStorageSync("nightSleepScoreApplied") || {};
  const oldNight = nightStore.date === key ? Number(nightStore.delta) || 0 : 0;
  const parts = decimalHoursToSleepParts(finalSleepHour);
  const nightNew = scoreUtil.calcSleepScore({
    sleepMode: "night",
    sleepHour: parts.sleepHour,
    sleepHalfHour: parts.sleepHalfHour
  });
  v = v - oldNight + nightNew;
  const sleepWas = Number(app.globalData.moduleScore.sleep) || 0;
  app.globalData.moduleScore.sleep = sleepWas - oldNight + nightNew;
  app.globalData.scoreValue = Math.max(0, Math.min(100, Math.round(v)));

  wx.setStorageSync("nightSleepScoreApplied", { date: key, delta: nightNew });
  wx.setStorageSync("nightSleepSavedDate", key);

  const summary = app.recalcDailySummary();
  const nightDelta = nightNew - oldNight;
  const actDelta = heatScore - actWas;
  return {
    summary,
    aiHints: {
      nightDelta,
      actDelta,
      oldNight,
      actWas,
      sleepParts: parts
    }
  };
}

module.exports = {
  decimalHoursToSleepParts,
  applyAiAnalyzeToApp
};
