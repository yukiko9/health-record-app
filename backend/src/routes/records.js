const express = require("express");
const {
  getOrCreateUser,
  getUserRecordsByDate,
  getTodayDateKey,
  addRecord,
  deleteRecordById,
  listRecent,
  listHighRate,
  listWeekProgress
} = require("../services/dataService");
const {
  calcActScore,
  calcEatingScore,
  calcSleepScore,
  calcEatingOverwhelmMarginal
} = require("../services/score");

const router = express.Router();

function readLimit(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(100, Math.trunc(n));
}

function getSitTotalBefore(dayRecords) {
  return dayRecords
    .filter((r) => r.module === "act" && r.panel === "sit-overtime-panel")
    .reduce((sum, r) => sum + (Number(r.payload && r.payload.sitOvertimeTime) || 0), 0);
}

function getNoonSleepSavesBefore(dayRecords) {
  return dayRecords.filter(
    (r) => r.module === "sleep" && r.payload && r.payload.sleepMode === "noon"
  ).length;
}

function getEatingCountsBefore(dayRecords) {
  const out = { wine: 0, milk: 0, coffee: 0 };
  dayRecords.forEach((r) => {
    if (r.module !== "eating") return;
    const m = (r.payload && r.payload.selectedMap) || {};
    if (m["drink-wine-btn"]) out.wine += 1;
    if (m["drink-milk-btn"]) out.milk += 1;
    if (m["coffee-btn"]) out.coffee += 1;
  });
  return out;
}

function getEatingPortionsBefore(dayRecords) {
  const out = { vegetable: 0, fruit: 0, protein: 0 };
  dayRecords.forEach((r) => {
    if (r.module !== "eating") return;
    const m = (r.payload && r.payload.selectedMap) || {};
    if (m["vegetable-btn"]) out.vegetable += 1;
    if (m["fruit-btn"]) out.fruit += 1;
    if (m["protein-btn"]) out.protein += 1;
  });
  return out;
}

function validateActInputMode(body) {
  const panelToKeys = {
    "slow-walk-panel": { time: "slowWalkTime", distance: "slowWalkDistance" },
    "fast-walk-panel": { time: "fastWalkTime", distance: "fastWalkDistance" },
    "jog-panel": { time: "jogTime", distance: "jogDistance" },
    "run-panel": { time: "runTime", distance: "runDistance" },
    "ride-panel": { time: "rideTime", distance: "rideDistance" }
  };
  const pair = panelToKeys[body.panel];
  if (!pair) return null;
  const mode = body.actInputMode === "distance" ? "distance" : "time";
  const timeVal = Number(body[pair.time]) || 0;
  const distanceVal = Number(body[pair.distance]) || 0;
  if (mode === "time" && distanceVal !== 0) {
    return `${body.panel} 在 time 模式下，距离字段必须为 0`;
  }
  if (mode === "distance" && timeVal !== 0) {
    return `${body.panel} 在 distance 模式下，时间字段必须为 0`;
  }
  return null;
}

router.get("/records/recent", (req, res) => {
  const limit = readLimit(req.query.limit, 20);
  const list = listRecent(req.user.id, limit);
  res.json({ list });
});

router.delete("/records/:id", (req, res) => {
  const { id } = req.params;
  const { ok, row } = deleteRecordById(req.user.id, id);
  if (!ok || !row) {
    return res.status(404).json({ success: false, message: "记录不存在" });
  }
  return res.json({
    success: true,
    scoreDelta: Number(row.scoreDelta) || 0,
    module: row.module,
    payload: row.payload || {}
  });
});

router.get("/records/high-rate", (req, res) => {
  const limit = readLimit(req.query.limit, 2);
  const list = listHighRate(req.user.id, limit);
  res.json({ list });
});

router.get("/records/week-progress", (req, res) => {
  const user = getOrCreateUser(req.user.id);
  const days = listWeekProgress(req.user.id, user.goal);
  res.json({ days });
});

router.post("/records/act", (req, res) => {
  const body = req.body || {};
  const dateKey = getTodayDateKey();
  const dayRecords = getUserRecordsByDate(req.user.id, dateKey);

  const modeErr = validateActInputMode(body);
  if (modeErr) {
    return res.status(400).json({ success: false, message: modeErr });
  }

  const payload = { ...body };
  if (payload.panel === "sit-overtime-panel" && payload.sitDailyTotalBefore == null) {
    payload.sitDailyTotalBefore = getSitTotalBefore(dayRecords);
  }

  const scoreDelta = calcActScore(payload);
  const row = addRecord(req.user.id, "act", payload, scoreDelta, dateKey);
  return res.json({
    success: true,
    id: row.id,
    recordedAt: row.recordedAt
  });
});

router.post("/records/eating", (req, res) => {
  const body = req.body || {};
  const dateKey = getTodayDateKey();
  const dayRecords = getUserRecordsByDate(req.user.id, dateKey);
  const payload = { ...body };
  const counts = getEatingCountsBefore(dayRecords);
  const portions = getEatingPortionsBefore(dayRecords);

  if (payload.wineCountToday == null) payload.wineCountToday = counts.wine;
  if (payload.milkCountToday == null) payload.milkCountToday = counts.milk;
  if (payload.coffeeCountToday == null) payload.coffeeCountToday = counts.coffee;

  const scoreDelta =
    calcEatingScore(payload) +
    calcEatingOverwhelmMarginal(portions, payload.selectedMap || {});

  const row = addRecord(req.user.id, "eating", payload, scoreDelta, dateKey);
  return res.json({
    success: true,
    id: row.id,
    recordedAt: row.recordedAt
  });
});

router.post("/records/sleep", (req, res) => {
  const body = req.body || {};
  const dateKey = getTodayDateKey();
  const dayRecords = getUserRecordsByDate(req.user.id, dateKey);
  const payload = { ...body };

  if (payload.sleepMode === "night") {
    const existsNight = dayRecords.some(
      (r) => r.module === "sleep" && r.payload && r.payload.sleepMode === "night"
    );
    if (existsNight) {
      return res.status(409).json({
        success: false,
        message: "同一自然日仅允许保存一条夜间睡眠记录"
      });
    }
  }

  if (payload.sleepMode === "noon" && payload.noonSleepSavesBefore == null) {
    payload.noonSleepSavesBefore = getNoonSleepSavesBefore(dayRecords);
  }

  const scoreDelta = calcSleepScore(payload);
  const row = addRecord(req.user.id, "sleep", payload, scoreDelta, dateKey);
  return res.json({
    success: true,
    id: row.id,
    recordedAt: row.recordedAt
  });
});

module.exports = router;
