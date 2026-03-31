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

function localDateKey() {
  return dateKeyFromDate(new Date());
}

function addDays(date, delta) {
  const x = new Date(date);
  x.setDate(x.getDate() + delta);
  return x;
}

function formatTimeOnly(recordedAt) {
  const h = recordedAt && recordedAt.hour != null ? recordedAt.hour : 0;
  const m = recordedAt && recordedAt.minute != null ? recordedAt.minute : 0;
  return `${h}时${m}分`;
}

module.exports = {
  startOfLocalDay,
  dateKeyFromDate,
  localDateKey,
  addDays,
  formatTimeOnly
};
