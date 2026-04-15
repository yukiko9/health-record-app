const { deleteRecordById } = require("./api");
const { computeRecordRevertDelta } = require("./revertRecordDelta");

/**
 * 删除一条最近活动记录（含服务端 id 或仅本地 localId），并回滚分数与相关 storage。
 * 任意页面在展示与 main-ui 相同结构的列表时均可复用。
 *
 * @param {{ id?: string, localId?: string, scoreDelta?: number, module?: string, scorePayload?: object, recordKind?: string }} item
 * @returns {Promise<{ ok: boolean, summary?: object, message?: string }>}
 */
async function runDeleteRecentRecord(item) {
  if (!item) {
    return { ok: false, message: "无效记录" };
  }
  const sd = Number(computeRecordRevertDelta(item));
  if (!Number.isFinite(sd)) {
    return { ok: false, message: "该记录无法回滚分数" };
  }
  const rid = item.id;
  const loc = item.localId;
  if (!rid && !loc) {
    return { ok: false, message: "无法删除该条" };
  }
  if (rid) {
    try {
      await deleteRecordById(rid);
    } catch (e) {
      const raw = e && e.message ? String(e.message) : "";
      return {
        ok: false,
        message: raw.length > 12 ? "删除失败" : raw || "删除失败"
      };
    }
  }
  const app = getApp();
  const summary = app.revertRecordedScoreDelta(item);
  return { ok: true, summary };
}

module.exports = { runDeleteRecentRecord };
