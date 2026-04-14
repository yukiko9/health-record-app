function calcActScore(payload) {
  const panel = payload.panel;
  const mode = payload.actInputMode === "distance" ? "distance" : "time";

  if (panel === "sit-overtime-panel") {
    const t = Number(payload.sitOvertimeTime) || 0;
    const before = Number(payload.sitDailyTotalBefore) || 0;
    if (before + t < 300) return 0;
    const tCap = Math.min(t, 240);
    return Math.trunc(tCap * 0.5);
  }

  let raw = 0;
  if (panel === "slow-walk-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.slowWalkDistance) || 0) * 0.00465
        : (((1 - 0.9 ** Number(payload.slowWalkTime)) / 0.1) || 0) * 0.467;
  } else if (panel === "fast-walk-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.fastWalkDistance) || 0) * 0.006
        : (0.7464 * (1 - 0.88 ** Number(payload.fastWalkTime)) / 0.12 || 0);
  } else if (panel === "jog-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.jogDistance) || 0) * 0.007
        : (1.494 * (1 - 0.88 ** Number(payload.jogTime)) / 0.15 || 0);
  } else if (panel === "run-panel") {
    raw =
      mode === "distance"
        ? (Number(payload.runDistance) || 0) * 0.009
        : (1.8664 * (1 - 0.82 ** Number(payload.runTime)) / 0.18 || 0);
  } else if (panel === "ride-panel") {
    raw =
      mode === "distance"
        ? 0.373 * (Number(payload.rideDistance) || 0)
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
    if (h <= 0) return 0;
    if (h <= 0.5) return 3;
    if (h <= 1) return 2;
    return 0;
  }
  if (h < 4 || h > 12) return 0;
  if (h < 5 || h > 11) return 2;
  if (h < 6 || h > 10) return 4;
  if (h < 7 || h > 9) return 7;
  return 8;
}

function totalEatingOverwhelmPenalty(portions) {
  const v = Number(portions.vegetable) || 0;
  const f = Number(portions.fruit) || 0;
  const p = Number(portions.protein) || 0;
  const vegPen = Math.min(Math.max(0, v - 5) * 1, 3);
  const fruitPen = Math.min(Math.max(0, f - 4) * 2, 3);
  const proteinPen = Math.min(Math.max(0, p - 3) * 2, 6);
  return vegPen + fruitPen + proteinPen;
}

function eatingPortionsAfterSave(before, selectedMap) {
  const m = selectedMap || {};
  return {
    vegetable: (Number(before.vegetable) || 0) + (m["vegetable-btn"] ? 1 : 0),
    fruit: (Number(before.fruit) || 0) + (m["fruit-btn"] ? 1 : 0),
    protein: (Number(before.protein) || 0) + (m["protein-btn"] ? 1 : 0)
  };
}

function calcEatingOverwhelmMarginal(beforePortions, selectedMap) {
  const after = eatingPortionsAfterSave(beforePortions, selectedMap);
  const penBefore = totalEatingOverwhelmPenalty(beforePortions);
  const penAfter = totalEatingOverwhelmPenalty(after);
  return penBefore - penAfter;
}

module.exports = {
  calcActScore,
  calcEatingScore,
  calcSleepScore,
  totalEatingOverwhelmPenalty,
  eatingPortionsAfterSave,
  calcEatingOverwhelmMarginal
};
