function localDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 久坐：读取本日已累计分钟（仅 sit-overtime 用） */
function getSitDailyTotalBefore() {
  const key = localDateKey();
  const raw = wx.getStorageSync("sitDailyAccum") || {};
  if (raw.date !== key) return 0;
  return Number(raw.total) || 0;
}

function calcActScore(payload) {
  const panel = payload.panel;
  const mode = payload.actInputMode === "distance" ? "distance" : "time";

  if (panel === "sit-overtime-panel") {
    const t = Number(payload.sitOvertimeTime) || 0;
    const before =
      payload.sitDailyTotalBefore != null
        ? Number(payload.sitDailyTotalBefore)
        : getSitDailyTotalBefore();
    if (before + t < 300) return 0;
    return Math.trunc(t * 0.5);
  }

  let raw = 0;
  if (panel === "slow-walk-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.slowWalkDistance) || 0) * 0.00465
        : (Number(payload.slowWalkTime) || 0) * 0.2335;
  } else if (panel === "fast-walk-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.fastWalkDistance) || 0) * 0.006
        : (Number(payload.fastWalkTime) || 0) * 0.465;
  } else if (panel === "jog-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.jogDistance) || 0) * 0.007
        : (Number(payload.jogTime) || 0) * 0.09335;
  } else if (panel === "run-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.runDistance) || 0) * 0.0625
        : (Number(payload.runTime) || 0) * 0.1895;
  }

  return Math.round(raw);
}

function winePenaltyForN(n) {
  if (n <= 1) return -3;
  if (n === 2) return -5;
  return -9;
}

function fullnessMultBalanced(f) {
  if (f === 3) return 1;
  if (f === 2 || f === 4) return 0.9;
  return 0.7;
}

function fullnessMultJunk(f) {
  if (f === 3) return 1;
  if (f === 2) return 0.9;
  if (f === 1) return 0.7;
  if (f === 4) return 1.2;
  return 1.4;
}

function calcEatingScore(payload) {
  const panel = payload.panel;
  const m = payload.selectedMap || {};
  const fullness = payload.fullness != null ? payload.fullness : 3;
  const wineCountToday = Number(payload.wineCountToday) || 0;
  const milkCountToday = Number(payload.milkCountToday) || 0;

  let eatingScore = 0;

  if (panel === "balanced-food-panel") {
    if (m["vegetable-btn"]) eatingScore += 2;
    if (m["protein-btn"]) eatingScore += 2;
    if (m["light-btn"]) eatingScore += 1;
    if (m["no-drink-btn"]) eatingScore += 1;
    eatingScore *= fullnessMultBalanced(fullness);
  } else if (panel === "junk-food-panel") {
    if (m["junk-btn"]) eatingScore -= 6;
    if (m["drink-btn"]) eatingScore -= 2;
    if (m["drink-wine-btn"]) {
      const n = wineCountToday + 1;
      eatingScore += winePenaltyForN(n);
    }
    eatingScore *= fullnessMultJunk(fullness);
  } else if (panel === "water-food-panel") {
    if (m["drink-water-btn"]) eatingScore += 1;
    if (m["fruit-btn"]) eatingScore += 2;
    if (m["drink-milk-btn"]) {
      const n = milkCountToday + 1;
      if (n <= 2) eatingScore += 5;
    }
  }

  if (
    panel === "balanced-food-panel" &&
    m["vegetable-btn"] &&
    m["protein-btn"] &&
    m["light-btn"]
  ) {
    eatingScore += 2;
  }

  return Math.trunc(eatingScore);
}

function calcSleepScore(payload) {
  const h =
    (Number(payload.sleepHour) || 0) +
    (Number(payload.sleepHalfHour) || 0) / 60;

  if (payload.sleepMode === "noon") {
    if (h <= 0.5) return 3;
    if (h <= 1) return 2;
    return 0;
  }
  if (h <= 4 & h>=12) return 0;
  if (h <= 5 & h>=11) return 2;
  if (h <= 6 & h>=10) return 4;
  if (h <= 7 & h>=9) return 7;
  return 8;
}

function getEatingCountsToday() {
  const key = localDateKey();
  const raw = wx.getStorageSync("eatingDailyBtnCounts") || {};
  if (raw.date !== key) return { wine: 0, milk: 0 };
  return { wine: Number(raw.wine) || 0, milk: Number(raw.milk) || 0 };
}

module.exports = {
  calcActScore,
  calcEatingScore,
  calcSleepScore,
  localDateKey,
  getSitDailyTotalBefore,
  getEatingCountsToday
};
