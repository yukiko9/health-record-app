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
        : (((1-0.9**Number(payload.slowWalkTime))/0.1) || 0) * 0.467;
  } else if (panel === "fast-walk-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.fastWalkDistance) || 0) * 0.006
        : (0.7464*(1-0.88**Number(payload.fastWalkTime))/0.12 || 0) ;
  } else if (panel === "jog-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.jogDistance) || 0) * 0.007
        : (1.494*(1-0.88**Number(payload.jogTime))/0.15 || 0);
  } else if (panel === "run-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.runDistance) || 0) * 0.009
        : (1.8664*(1-0.82**Number(payload.runTime))/0.18 || 0);
  } else if (panel === "ride-panel") {
    raw =
      mode === "distance"
        ? 0.009325 * (Number(payload.rideDistance) || 0)
        : (1.6 * (1 - 0.88 ** Number(payload.rideTime || 0))) / 0.12;
    return Math.round(Math.min(6, raw));
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

function milkteaPenaltyForSugar(sugar) {
  if (sugar === "full") return -5;
  if (sugar === "half") return -3;
  if (sugar === "light") return -2;
  if (sugar === "none") return -1;
  return 0;
}

function calcEatingScore(payload) {
  const panel = payload.panel;
  const m = payload.selectedMap || {};
  const fullness = payload.fullness != null ? payload.fullness : 3;
  const wineCountToday = Number(payload.wineCountToday) || 0;
  const milkCountToday = Number(payload.milkCountToday) || 0;
  const coffeeCountToday = Number(payload.coffeeCountToday) || 0;

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
    if (m["milktea-btn"]) {
      eatingScore += milkteaPenaltyForSugar(payload.milkteaSugar);
    }
    if (m["puffed-food-btn"]) eatingScore -= 2;
    eatingScore *= fullnessMultJunk(fullness);
  } else if (panel === "water-food-panel") {
    if (m["drink-water-btn"]) eatingScore += 1;
    if (m["fruit-btn"]) eatingScore += 2;
    if (m["drink-milk-btn"]) {
      const n = milkCountToday + 1;
      if (n <= 2) eatingScore += 5;
    }
    if (m["coffee-btn"]) {
      const n = coffeeCountToday + 1;
      if (n === 1) eatingScore += 1;
      else if (n === 2) eatingScore += 0;
      else eatingScore -= 1;
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
    if ((Number(payload.noonSleepSavesBefore) || 0) >= 1) return 0;
    if (h <= 0.5) return 3;
    if (h <= 1) return 2;
    return 0;
  }
  /* 夜间：时长过短或过长扣分，约 7～9 小时满分（与产品表一致时可再调阈值） */
  if (h < 4 || h > 12) return 0;
  if (h < 5 || h > 11) return 2;
  if (h < 6 || h > 10) return 4;
  if (h < 7 || h > 9) return 7;
  return 8;
}

function getEatingCountsToday() {
  const key = localDateKey();
  const raw = wx.getStorageSync("eatingDailyBtnCounts") || {};
  if (raw.date !== key) return { wine: 0, milk: 0, coffee: 0 };
  return {
    wine: Number(raw.wine) || 0,
    milk: Number(raw.milk) || 0,
    coffee: Number(raw.coffee) || 0
  };
}

/** 当日已保存的蔬菜/水果/蛋白「份」计数（不含本次） */
function getEatingPortionCountsToday() {
  const key = localDateKey();
  const raw = wx.getStorageSync("eatingDailyBtnCounts") || {};
  if (raw.date !== key) {
    return { wine: 0, milk: 0, coffee: 0, vegetable: 0, fruit: 0, protein: 0 };
  }
  return {
    wine: Number(raw.wine) || 0,
    milk: Number(raw.milk) || 0,
    coffee: Number(raw.coffee) || 0,
    vegetable: Number(raw.vegetable) || 0,
    fruit: Number(raw.fruit) || 0,
    protein: Number(raw.protein) || 0
  };
}

/** 超量惩罚当日累计扣分（正数，表示应从分数中扣掉的总量） */
function totalEatingOverwhelmPenalty(portions) {
  const v = Number(portions.vegetable) || 0;
  const f = Number(portions.fruit) || 0;
  const p = Number(portions.protein) || 0;
  const vegPen = Math.min(Math.max(0, v - 5) * 1, 3);
  const fruitPen = Math.min(Math.max(0, f - 4) * 2, 3);
  const proteinPen = Math.min(Math.max(0, p - 3) * 2, 6);
  return vegPen + fruitPen + proteinPen;
}

/** 本次保存/快捷记分后份数（各 +1 若对应 btn 勾选） */
function eatingPortionsAfterSave(before, selectedMap) {
  const m = selectedMap || {};
  return {
    vegetable: before.vegetable + (m["vegetable-btn"] ? 1 : 0),
    fruit: before.fruit + (m["fruit-btn"] ? 1 : 0),
    protein: before.protein + (m["protein-btn"] ? 1 : 0)
  };
}

/** 边际超量扣分：应叠加到 calcEatingScore 结果上（通常为 ≤0） */
function calcEatingOverwhelmMarginal(beforePortions, selectedMap) {
  const after = eatingPortionsAfterSave(beforePortions, selectedMap);
  const penBefore = totalEatingOverwhelmPenalty(beforePortions);
  const penAfter = totalEatingOverwhelmPenalty({
    vegetable: after.vegetable,
    fruit: after.fruit,
    protein: after.protein
  });
  return penBefore - penAfter;
}

function getNoonSleepSavesToday() {
  const key = localDateKey();
  const raw = wx.getStorageSync("noonSleepSaves") || {};
  if (raw.date !== key) return 0;
  return Number(raw.count) || 0;
}

module.exports = {
  calcActScore,
  calcEatingScore,
  calcSleepScore,
  localDateKey,
  getSitDailyTotalBefore,
  getNoonSleepSavesToday,
  getEatingCountsToday,
  getEatingPortionCountsToday,
  totalEatingOverwhelmPenalty,
  eatingPortionsAfterSave,
  calcEatingOverwhelmMarginal
};
