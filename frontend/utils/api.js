const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 按 AnyService 使用指南重写调用逻辑：
 * 1) app.js 里全局 wx.cloud.init（env: healthbook-6g0u9wm07f2a2e45）
 * 2) 请求统一走 wx.cloud.callContainer
 * 3) header 固定带 X-WX-SERVICE: tcbanyservice + X-AnyService-Name
 * 4) path 从根路径开始（/api/...）
 */
const API_BASE = "https://health-record-app-rose.vercel.app";

/** AnyService 中配置的服务标识 → 请求头 X-AnyService-Name（须与控制台一致，见 anyservice.md） */
const ANY_SERVICE_NAME = "healthbook";

const CALL_CONTAINER_TIMEOUT = 10000;

function useMock() {
  return !API_BASE || !String(API_BASE).trim();
}

function normalizeContainerData(data, dataType) {
  if (data == null) return data;
  if (dataType === "text") return String(data);
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      return data;
    }
  }
  return data;
}

function guessImageMimeByPath(filePath) {
  const lower = String(filePath).toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function readLocalFileBase64(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: "base64",
      success: (r) => resolve(r.data),
      fail: (err) => reject(err || new Error("readFile fail")),
    });
  });
}

function logCloudApiError(tag, info) {
  try {
    console.error("[cloud API]", tag, info);
  } catch (e) {
    /* ignore */
  }
}

/**
 * AnyService 统一请求封装（遵循 anyservice.md / 官方文档）
 */
function callAnyService(relPath, method, options = {}) {
  if (
    typeof wx.cloud === "undefined" ||
    typeof wx.cloud.callContainer !== "function"
  ) {
    logCloudApiError("callContainer_unavailable", { relPath, method });
    return Promise.reject(
      new Error(
        "wx.cloud.callContainer 不可用，请确认已开通云开发、app.json 含 cloud:true，并在 app.js 中完成 wx.cloud.init",
      ),
    );
  }
  const path = relPath.startsWith("/") ? relPath : `/${relPath}`;
  const upper = (method || "GET").toUpperCase();
  const headers = {
    "X-WX-SERVICE": "tcbanyservice",
    "X-AnyService-Name": ANY_SERVICE_NAME,
  };
  if (upper !== "GET" && upper !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  Object.assign(headers, options.header || {});

  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      path,
      method: upper,
      header: headers,
      data: options.data == null ? undefined : options.data,
      dataType: options.dataType || "json",
      timeout: options.timeout || CALL_CONTAINER_TIMEOUT,
      success(res) {
        const sc = res.statusCode;
        const payload = normalizeContainerData(res.data, options.dataType);
        if (sc >= 200 && sc < 300) {
          resolve({
            statusCode: sc,
            data: payload,
            header: res.header || {},
          });
        } else {
          logCloudApiError("http_non_2xx", {
            path,
            method: upper,
            statusCode: sc,
            upstreamStatus:
              (res.header && res.header["x-cloudbase-upstream-status-code"]) ||
              undefined,
            bodyPreview:
              typeof payload === "object"
                ? JSON.stringify(payload).slice(0, 500)
                : String(payload).slice(0, 500),
          });
          const msg =
            payload && typeof payload === "object" && payload.message
              ? payload.message
              : `http ${sc}`;
          reject(new Error(msg));
        }
      },
      fail(err) {
        logCloudApiError("callContainer_fail", {
          path,
          method: upper,
          errMsg: err && err.errMsg,
          errCode: err && err.errCode,
          errno: err && err.errno,
        });
        const e = new Error(
          err && err.errCode === -1
            ? "网络连接失败"
            : err && err.errCode === 40001
              ? "服务暂不可用"
              : "请求失败，请重试",
        );
        e.raw = err;
        reject(e);
      },
    });
  });
}

/** mock 下用于模拟 GET recent，与三条 POST 写入 */
let mockRecentList = [];

const MOCK_USER_GOAL_KEY = "mockUserGoal";

function readStoredMockGoal() {
  try {
    const g = wx.getStorageSync(MOCK_USER_GOAL_KEY);
    if (g != null && g !== "") {
      const n = Number(g);
      if (!Number.isNaN(n)) {
        return Math.max(0, Math.min(99, Math.round(n)));
      }
    }
  } catch (e) {
    /* ignore */
  }
  return 80;
}

function buildRecordedAt(date = new Date()) {
  const month = date.getMonth() + 1;
  const d = date.getDate();
  const day = `${String(month).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
  return {
    day,
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function formatRecordedAtDisplay(recordedAt) {
  if (!recordedAt) return "";
  const day = recordedAt.day != null ? String(recordedAt.day) : "";
  const h = recordedAt.hour != null ? recordedAt.hour : 0;
  const m = recordedAt.minute != null ? recordedAt.minute : 0;
  const tail = `${h}时${m}分`;
  return day ? `${day} ${tail}` : tail;
}

/** 最近列表等：仅「时、分」，不含日期 */
function formatRecordedAtTimeOnly(recordedAt) {
  if (!recordedAt) return "";
  const h = recordedAt.hour != null ? recordedAt.hour : 0;
  const m = recordedAt.minute != null ? recordedAt.minute : 0;
  return `${h}时${m}分`;
}

function stripDayFromTimeDisplay(s) {
  if (s == null || !String(s).trim()) return "";
  const str = String(s).trim();
  const m = str.match(/^\d{1,2}\/\d{1,2}\s+(.+)$/);
  return m ? m[1] : str;
}

function buildActSummary(payload) {
  const mode = payload.actInputMode === "distance" ? "distance" : "time";
  const map = {
    "slow-walk-panel":
      mode === "distance"
        ? `慢走，${payload.slowWalkDistance}米`
        : `慢走，${payload.slowWalkTime}min`,
    "fast-walk-panel":
      mode === "distance"
        ? `快走，${payload.fastWalkDistance}米`
        : `快走，${payload.fastWalkTime}min`,
    "jog-panel":
      mode === "distance"
        ? `慢跑，${payload.jogDistance}米`
        : `慢跑，${payload.jogTime}min`,
    "run-panel":
      mode === "distance"
        ? `跑步，${payload.runDistance}米`
        : `跑步，${payload.runTime}min`,
    "sit-overtime-panel": `久坐，${payload.sitOvertimeTime}min`,
    "ride-panel":
      mode === "distance"
        ? `骑行，${payload.rideDistance}米`
        : `骑行，${payload.rideTime}min`,
  };
  return map[payload.panel] || "活动记录";
}

const FOOD_LABELS = {
  "vegetable-btn": "蔬菜",
  "protein-btn": "蛋白质",
  "light-btn": "清淡",
  "no-drink-btn": "不饮酒",
  "junk-btn": "垃圾食品",
  "drink-btn": "饮品",
  "drink-wine-btn": "酒",
  "drink-water-btn": "喝水",
  "fruit-btn": "水果",
  "drink-milk-btn": "喝牛奶",
  "milktea-btn": "奶茶",
  "puffed-food-btn": "膨化食品(一袋)",
  "coffee-btn": "咖啡",
};

const DRINK_STYLE_KEYS = {
  "drink-water-btn": true,
  "drink-milk-btn": true,
  "coffee-btn": true,
  "milktea-btn": true,
};

function eatingPhraseForKey(key, payload) {
  if (key === "milktea-btn" && payload && payload.milkteaSugar) {
    const map = { full: "全糖", half: "半糖", light: "微糖", none: "无糖" };
    const lab = map[payload.milkteaSugar] || "";
    return lab ? `喝奶茶（${lab}）` : "喝奶茶";
  }
  if (DRINK_STYLE_KEYS[key]) {
    const raw = FOOD_LABELS[key] || key;
    if (raw.startsWith("喝")) return raw;
    return `喝${raw}`;
  }
  const base = FOOD_LABELS[key] || key;
  if (base.startsWith("吃")) return base;
  return `吃${base}`;
}

function buildEatingSummary(payload) {
  const selected = Object.keys(payload.selectedMap || {}).filter(
    (k) => payload.selectedMap[k],
  );
  const parts = selected
    .map((k) => eatingPhraseForKey(k, payload))
    .filter(Boolean);
  const fullness = payload.fullness != null ? payload.fullness : "";
  if (parts.length) {
    return `${parts.join("、")}，饱食度为${fullness}`;
  }
  return `饮食记录，饱食度为${fullness}`;
}

function buildSleepSummary(payload) {
  const h = payload.sleepHour || 0;
  const hm = payload.sleepHalfHour || 0;
  const dur = hm ? `${h}小时${hm}分` : `${h}小时`;
  if (payload.sleepMode === "night") {
    return `夜间睡眠 ${dur}`;
  }
  if (payload.sleepMode === "noon") {
    return `午睡 ${dur}`;
  }
  return `睡眠 ${dur}`;
}

function normalizeDoFromRecord(record) {
  const d = record.do;
  if (d === "活动" || d === "饮食" || d === "睡眠") {
    return d;
  }
  const m = record.module || record.type || record.kind;
  if (m === "act" || m === "activity") return "活动";
  if (m === "eating") return "饮食";
  if (m === "sleep") return "睡眠";
  return "活动";
}

function mapRecordToRecentItem(record) {
  if (!record || typeof record !== "object") {
    return { do: "", time: "", info: "" };
  }
  const doLabel = normalizeDoFromRecord(record);
  let timeStr = "";
  if (record.time != null && String(record.time).length) {
    timeStr = stripDayFromTimeDisplay(record.time);
  } else if (record.recordedAt) {
    timeStr = formatRecordedAtTimeOnly(record.recordedAt);
  }
  let infoStr = "";
  if (record.info != null && String(record.info).length) {
    infoStr = String(record.info);
  } else if (record.summary != null) {
    infoStr = String(record.summary);
  }
  return { do: doLabel, time: timeStr, info: infoStr };
}

function requestJson(path, method, data) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const upper = (method || "GET").toUpperCase();
  if (upper === "GET" || upper === "HEAD") {
    return callAnyService(p, method, {}).then((r) => r.data);
  }
  return callAnyService(p, method, {
    data: data == null ? {} : data,
  }).then((r) => r.data);
}

async function fetchDashboardProfile() {
  if (useMock()) {
    await delay();
    return { username: "username", goal: readStoredMockGoal(), duration: 0 };
  }
  const raw = await requestJson("/api/dashboard", "GET");
  const data = raw && raw.data != null ? raw.data : raw;
  return {
    username: data.username != null ? data.username : "username",
    goal: data.goal != null ? data.goal : 80,
    duration: data.duration != null ? data.duration : 0,
  };
}

async function fetchRecentActList(limit = 20) {
  if (useMock()) {
    await delay();
    return mockRecentList.slice(0, limit).map((x) => ({
      do: x.do,
      time: x.time,
      info: x.info,
    }));
  }
  const raw = await requestJson(
    `/api/records/recent?limit=${encodeURIComponent(limit)}`,
    "GET",
  );
  const payload = raw && raw.data != null ? raw.data : raw;
  const list = payload && payload.list != null ? payload.list : payload;
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map(mapRecordToRecentItem);
}

async function fetchUserDashboard() {
  const [profile, recentActList] = await Promise.all([
    fetchDashboardProfile(),
    fetchRecentActList(20),
  ]);
  return {
    username: profile.username,
    goal: profile.goal,
    duration: profile.duration,
    recentActList,
  };
}

async function saveGoal(payload) {
  if (useMock()) {
    await delay();
    if (payload && payload.goal != null) {
      const g = Math.max(0, Math.min(99, Math.round(Number(payload.goal))));
      if (!Number.isNaN(g)) {
        wx.setStorageSync(MOCK_USER_GOAL_KEY, g);
      }
    }
    return { success: true, payload };
  }
  const raw = await requestJson("/api/goal/save", "POST", payload);
  return raw && raw.data != null ? raw.data : raw;
}

function pushMockRecent(
  moduleLabel,
  recordedAt,
  summary,
  scorePayload,
  moduleKey,
) {
  const item = {
    do: moduleLabel,
    time: formatRecordedAtTimeOnly(recordedAt),
    info: summary,
    module: moduleKey,
    scorePayload:
      scorePayload && typeof scorePayload === "object"
        ? { ...scorePayload }
        : null,
  };
  mockRecentList = [item, ...mockRecentList].slice(0, 20);
}

function moduleKeyFromDoOrModule(record) {
  const m = record.module;
  if (m === "act" || m === "eating" || m === "sleep") return m;
  const d = record.do;
  if (d === "活动") return "act";
  if (d === "饮食") return "eating";
  if (d === "睡眠") return "sleep";
  return "";
}

function emptyHighRateSlot() {
  return {
    do: "—",
    info: "—",
    module: "",
    scorePayload: null,
    valid: false,
  };
}

function normalizeHighRateItem(record) {
  if (!record || typeof record !== "object") {
    return emptyHighRateSlot();
  }
  const base = mapRecordToRecentItem(record);
  const module = moduleKeyFromDoOrModule({ ...record, do: base.do });
  const scorePayload =
    record.scorePayload != null && typeof record.scorePayload === "object"
      ? record.scorePayload
      : null;
  const valid = !!(module && scorePayload);
  return {
    do: base.do || "—",
    info: base.info || "—",
    module,
    scorePayload,
    valid,
  };
}

function padHighRateList(list) {
  const out = (list || []).slice(0, 2).map(normalizeHighRateItem);
  while (out.length < 2) {
    out.push(emptyHighRateSlot());
  }
  return out;
}

function buildMockHighRateList() {
  const list = mockRecentList;
  if (!list.length) {
    return padHighRateList([]);
  }
  const byInfo = {};
  list.forEach((item, idx) => {
    const k = item.info != null ? String(item.info) : "";
    if (!byInfo[k]) byInfo[k] = [];
    byInfo[k].push({ item, idx });
  });
  const meta = Object.keys(byInfo).map((info) => ({
    info,
    count: byInfo[info].length,
    minIdx: Math.min(...byInfo[info].map((x) => x.idx)),
  }));
  const hasDup = meta.some((m) => m.count > 1);
  let picked = [];
  if (hasDup) {
    meta.sort((a, b) => b.count - a.count || a.minIdx - b.minIdx);
    const seen = new Set();
    for (let i = 0; i < meta.length && picked.length < 2; i += 1) {
      const first = byInfo[meta[i].info][0].item;
      const key = first.info || "";
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(first);
    }
  } else {
    picked = list.slice(0, 2);
  }
  return padHighRateList(picked);
}

async function fetchHighRateActList(limit = 2) {
  if (useMock()) {
    await delay();
    return buildMockHighRateList().slice(0, limit);
  }
  try {
    const raw = await requestJson(
      `/api/records/high-rate?limit=${encodeURIComponent(limit)}`,
      "GET",
    );
    const payload = raw && raw.data != null ? raw.data : raw;
    const list = payload && payload.list != null ? payload.list : payload;
    if (!Array.isArray(list)) {
      return padHighRateList([]);
    }
    return padHighRateList(list);
  } catch (e) {
    return padHighRateList([]);
  }
}

async function saveActRecord(payload) {
  const recordedAt = buildRecordedAt();
  const summary = buildActSummary(payload);
  const body = { ...payload, recordedAt, summary };
  if (useMock()) {
    await delay();
    pushMockRecent("活动", recordedAt, summary, payload, "act");
    return { success: true, payload: body };
  }
  const raw = await requestJson("/api/records/act", "POST", body);
  return raw && raw.data != null ? raw.data : raw;
}

async function saveEatingRecord(payload) {
  const recordedAt = buildRecordedAt();
  const summary = buildEatingSummary(payload);
  const body = { ...payload, recordedAt, summary };
  if (useMock()) {
    await delay();
    pushMockRecent("饮食", recordedAt, summary, payload, "eating");
    return { success: true, payload: body };
  }
  const raw = await requestJson("/api/records/eating", "POST", body);
  return raw && raw.data != null ? raw.data : raw;
}

async function saveSleepRecord(payload) {
  const recordedAt = buildRecordedAt();
  const summary = buildSleepSummary(payload);
  const body = { ...payload, recordedAt, summary };
  if (useMock()) {
    await delay();
    pushMockRecent("睡眠", recordedAt, summary, payload, "sleep");
    return { success: true, payload: body };
  }
  const raw = await requestJson("/api/records/sleep", "POST", body);
  return raw && raw.data != null ? raw.data : raw;
}

/** 五日条：后端返回 { days: { "YYYY-MM-DD": { won, score, goal } } } } */
async function fetchWeekProgress() {
  if (useMock()) {
    await delay();
    const stored = wx.getStorageSync("mockWeekDayMap");
    const days = stored && typeof stored === "object" ? stored : {};
    return { days };
  }
  try {
    const raw = await requestJson("/api/records/week-progress", "GET");
    const payload = raw && raw.data != null ? raw.data : raw;
    return {
      days: (payload && payload.days) || {},
    };
  } catch (e) {
    return { days: {} };
  }
}

/**
 * 上传截图供后端视觉/OCR 解析；返回 JSON 中的 sleepHour、calorie（可为 undefined）
 * @param {string} filePath 本地临时路径
 */
async function uploadAiAnalyzeImage(filePath) {
  if (useMock()) {
    await delay();
    return { sleepHour: 7, calorie: 640 };
  }
  const imageBase64 = await readLocalFileBase64(filePath);
  const mimeType = guessImageMimeByPath(filePath);
  const raw = await callAnyService("/api/ai/analyze-json", "POST", {
    data: { imageBase64, mimeType },
  });
  const payload = raw && raw.data != null ? raw.data : raw;
  return payload && typeof payload === "object" ? payload : {};
}

module.exports = {
  API_BASE,
  ANY_SERVICE_NAME,
  useMock,
  buildRecordedAt,
  formatRecordedAtDisplay,
  formatRecordedAtTimeOnly,
  buildActSummary,
  buildEatingSummary,
  buildSleepSummary,
  mapRecordToRecentItem,
  fetchUserDashboard,
  fetchRecentActList,
  fetchHighRateActList,
  fetchWeekProgress,
  saveGoal,
  saveActRecord,
  saveEatingRecord,
  saveSleepRecord,
  uploadAiAnalyzeImage,
};
