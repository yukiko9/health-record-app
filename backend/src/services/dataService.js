const { v4: uuidv4 } = require("uuid");
const { getState, updateState } = require("../store");
const { localDateKey, formatTimeOnly, addDays, dateKeyFromDate } = require("../utils/date");

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function mapModuleToDo(module) {
  if (module === "act") return "活动";
  if (module === "eating") return "饮食";
  if (module === "sleep") return "睡眠";
  return "活动";
}

function getOrCreateUser(userId) {
  const key = String(userId || "1");
  const current = getState();
  if (current.users[key]) {
    return { id: key, ...current.users[key] };
  }
  const user = {
    username: "username",
    goal: 80,
    createdAt: new Date().toISOString()
  };
  updateState((s) => ({
    ...s,
    users: {
      ...s.users,
      [key]: user
    }
  }));
  return { id: key, ...user };
}

function updateUserGoal(userId, goal) {
  const key = String(userId);
  updateState((s) => {
    const oldUser = s.users[key] || { username: "username", goal: 80, createdAt: new Date().toISOString() };
    return {
      ...s,
      users: {
        ...s.users,
        [key]: {
          ...oldUser,
          goal: clamp(Math.round(Number(goal) || 0), 0, 99)
        }
      }
    };
  });
}

function getUserRecords(userId) {
  const key = String(userId);
  return getState().records.filter((r) => String(r.userId) === key);
}

function getUserRecordsByDate(userId, dateKey) {
  return getUserRecords(userId).filter((r) => r.dateKey === dateKey);
}

function getTodayDateKey() {
  return localDateKey();
}

function addRecord(userId, module, body, scoreDelta, dateKey) {
  const recordedAt = body.recordedAt || {};
  const row = {
    id: uuidv4(),
    userId: String(userId),
    module,
    panel: body.panel || "",
    summary: body.summary || "",
    recordedAt: {
      day: recordedAt.day || "",
      hour: recordedAt.hour != null ? Number(recordedAt.hour) : 0,
      minute: recordedAt.minute != null ? Number(recordedAt.minute) : 0
    },
    dateKey: dateKey || getTodayDateKey(),
    scoreDelta: Number(scoreDelta) || 0,
    payload: body,
    createdAt: new Date().toISOString()
  };

  updateState((s) => ({
    ...s,
    records: [row, ...s.records]
  }));

  return row;
}

function sortRecordsDesc(a, b) {
  const ka = `${a.dateKey} ${String(a.recordedAt.hour).padStart(2, "0")}:${String(a.recordedAt.minute).padStart(2, "0")}`;
  const kb = `${b.dateKey} ${String(b.recordedAt.hour).padStart(2, "0")}:${String(b.recordedAt.minute).padStart(2, "0")}`;
  if (ka < kb) return 1;
  if (ka > kb) return -1;
  if (a.createdAt < b.createdAt) return 1;
  if (a.createdAt > b.createdAt) return -1;
  return 0;
}

function buildRecentItem(record) {
  return {
    id: record.id,
    do: mapModuleToDo(record.module),
    time: formatTimeOnly(record.recordedAt),
    info: record.summary || "",
    module: record.module,
    scoreDelta: Number(record.scoreDelta) || 0,
    scorePayload: record.payload || {}
  };
}

function listRecent(userId, limit = 20) {
  return getUserRecords(userId)
    .slice()
    .sort(sortRecordsDesc)
    .slice(0, limit)
    .map(buildRecentItem);
}

function isNightSleepRecord(row) {
  return (
    row &&
    row.module === "sleep" &&
    row.payload &&
    row.payload.sleepMode === "night"
  );
}

function listHighRate(userId, limit = 2) {
  const records = getUserRecords(userId)
    .slice()
    .filter((r) => !isNightSleepRecord(r))
    .sort(sortRecordsDesc);
  if (!records.length) return [];

  const byInfo = {};
  records.forEach((row, idx) => {
    const key = row.summary || "";
    if (!byInfo[key]) byInfo[key] = [];
    byInfo[key].push({ row, idx });
  });

  const stats = Object.keys(byInfo).map((info) => {
    const list = byInfo[info];
    return {
      info,
      count: list.length,
      firstIdx: Math.min(...list.map((x) => x.idx))
    };
  });

  const hasDuplicate = stats.some((x) => x.count > 1);
  let picked = [];
  if (hasDuplicate) {
    stats.sort((a, b) => b.count - a.count || a.firstIdx - b.firstIdx);
    const used = new Set();
    for (let i = 0; i < stats.length && picked.length < limit; i += 1) {
      const first = byInfo[stats[i].info][0].row;
      if (used.has(first.summary)) continue;
      used.add(first.summary);
      picked.push(first);
    }
  } else {
    picked = records.slice(0, limit);
  }

  return picked.map((r) => ({
    do: mapModuleToDo(r.module),
    info: r.summary || "",
    module: r.module,
    scorePayload: r.payload || {}
  }));
}

function computeDailySummary(userId, dateKey, goal) {
  const dayRows = getUserRecordsByDate(userId, dateKey);
  const sum = dayRows.reduce((acc, row) => acc + (Number(row.scoreDelta) || 0), 0);
  const score = clamp(Math.round(60 + sum), 0, 100);
  return {
    score,
    goal,
    won: score >= goal
  };
}

function listWeekProgress(userId, goal) {
  const today = new Date();
  const days = {};
  for (let i = -3; i <= 1; i += 1) {
    const dateKey = dateKeyFromDate(addDays(today, i));
    const rows = getUserRecordsByDate(userId, dateKey);
    if (!rows.length) continue;
    const summary = computeDailySummary(userId, dateKey, goal);
    days[dateKey] = summary;
  }
  return days;
}

function deleteRecordById(userId, id) {
  const key = String(userId);
  const rid = String(id || "").trim();
  if (!rid) return { ok: false, row: null };
  const current = getState();
  const idx = current.records.findIndex(
    (r) => String(r.userId) === key && String(r.id) === rid,
  );
  if (idx < 0) return { ok: false, row: null };
  const row = current.records[idx];
  updateState((s) => ({
    ...s,
    records: s.records.filter((_, i) => i !== idx),
  }));
  return { ok: true, row };
}

function getWinStreak(userId, goal) {
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = dateKeyFromDate(cursor);
    const rows = getUserRecordsByDate(userId, key);
    if (!rows.length) break;
    const summary = computeDailySummary(userId, key, goal);
    if (!summary.won) break;
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

module.exports = {
  getOrCreateUser,
  updateUserGoal,
  getUserRecords,
  getUserRecordsByDate,
  getTodayDateKey,
  addRecord,
  deleteRecordById,
  listRecent,
  listHighRate,
  computeDailySummary,
  listWeekProgress,
  getWinStreak
};
