const WEEK_EN = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];
const WEEK_ZH = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function startOfLocalDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKeyFromDate(d) {
  const x = startOfLocalDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildFiveDaySlots() {
  const today = startOfLocalDay(new Date());
  const todayKey = dateKeyFromDate(today);
  const out = [];
  for (let i = 0; i < 5; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + (i - 3));
    const dk = dateKeyFromDate(day);
    const dow = day.getDay();
    out.push({
      dateKey: dk,
      labelEn: WEEK_EN[dow],
      labelZh: WEEK_ZH[dow],
      isToday: dk === todayKey,
      isFuture: day.getTime() > today.getTime(),
      hasRecord: false,
      won: false,
      showTrophy: false,
      score: null,
      goal: null
    });
  }
  return out;
}

function mergeWeekApi(slots, apiDays) {
  if (!apiDays || typeof apiDays !== "object") return slots;
  return slots.map((s) => {
    const row = apiDays[s.dateKey];
    if (!row) return s;
    return {
      ...s,
      hasRecord: true,
      won: !!row.won,
      showTrophy: !!row.won,
      score: row.score != null ? row.score : s.score,
      goal: row.goal != null ? row.goal : s.goal
    };
  });
}

module.exports = {
  dateKeyFromDate,
  buildFiveDaySlots,
  mergeWeekApi,
  WEEK_EN,
  WEEK_ZH
};
