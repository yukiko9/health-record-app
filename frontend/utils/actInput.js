/** 活动录入：空输入用 null，避免父层 0 回写到 input 显示成「0」 */
function metricFromInput(str) {
  const t = (str || "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** 仅保留整数部分用于展示与提交（去掉小数点及之后） */
function sanitizeIntString(str) {
  const s = String(str || "").replace(/[^\d]/g, "");
  return s;
}

module.exports = { metricFromInput, sanitizeIntString };
