const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const { extractTextFromImage } = require("./ocrExtract");
const scoreUtil = require("./score");

/**
 * 微信云托管调用（与 wxcloudbuilding.md、官方文档一致）：
 * - app.js：wx.cloud.init({ env: CLOUD_ENV_ID })
 * - wx.cloud.callContainer({ config: { env }, path, method, header, data })
 * - header：仅 X-WX-SERVICE = 云托管「服务名称」（控制台服务列表）
 * 文档：调用云托管服务 https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/call/
 *      CloudBase 小程序接入 https://docs.cloudbase.net/run/develop/access/mini
 */
const API_BASE =
  "https://healthbook-244949-5-1418437518.sh.run.tcloudbase.com/";

/** 云开发环境 ID（须与控制台一致，与 wxcloudbuilding.md 中 config.env 相同） */
const CLOUD_ENV_ID = "prod-5g4vryi1618f27a5";

/** 云托管服务名称 → 请求头 X-WX-SERVICE（与 wxcloudbuilding.md 示例一致） */
const CLOUD_SERVICE_NAME = "healthbook";

/**
 * 若容器内路由前有额外前缀（少见），可填如 "/backend"；默认 "" 即 path 为 /api/...
 */
const CLOUD_API_PATH_PREFIX = "";

const CALL_CONTAINER_TIMEOUT = 10000;

/**
 * 联调：为 true 时在 Console 输出云托管链路诊断（上线前改为 false）。
 * 常量为 false 时，可 wx.setStorageSync("DEBUG_CLOUD_CONTAINER", true) 临时开启。
 */
const DEBUG_CLOUD_CONTAINER = true;

function useMock() {
  return !API_BASE || !String(API_BASE).trim();
}

function buildCloudApiPath(relPath) {
  const p = relPath.startsWith("/") ? relPath : `/${relPath}`;
  const pre = String(CLOUD_API_PATH_PREFIX || "").replace(/\/$/, "");
  if (!pre) return p;
  return `${pre}${p}`;
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

function logCloudApiError(tag, info) {
  try {
    console.error("[cloud API]", tag, info);
  } catch (e) {
    /* ignore */
  }
}

function isCloudContainerDebugEnabled() {
  if (DEBUG_CLOUD_CONTAINER) return true;
  try {
    return wx.getStorageSync("DEBUG_CLOUD_CONTAINER") === true;
  } catch (e) {
    return false;
  }
}

/** 从 callContainer 返回的 header 中提取云托管诊断字段（大小写不敏感） */
function pickCloudRunDiagHeaders(header) {
  if (!header || typeof header !== "object") {
    return {};
  }
  const map = {};
  Object.keys(header).forEach((k) => {
    map[String(k).toLowerCase()] = header[k];
  });
  return {
    xCloudbaseRequestId: map["x-cloudbase-request-id"],
    xCloudbaseUpstreamStatusCode: map["x-cloudbase-upstream-status-code"],
    xCloudbaseUpstreamTimecost: map["x-cloudbase-upstream-timecost"],
    xCloudbaseUpstreamType: map["x-cloudbase-upstream-type"],
  };
}

function logCloudContainerDiag(label, ctx) {
  if (!isCloudContainerDebugEnabled()) return;
  try {
    console.log("[cloud container]", label, ctx);
  } catch (e) {
    /* ignore */
  }
}

/**
 * 微信云托管统一请求（wx.cloud.callContainer）
 */
function callCloudContainer(relPath, method, options = {}) {
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
  const path = buildCloudApiPath(relPath);
  const upper = (method || "GET").toUpperCase();
  const headers = {
    "X-WX-SERVICE": CLOUD_SERVICE_NAME,
  };
  if (upper !== "GET" && upper !== "HEAD") {
    headers["Content-Type"] = "application/json";
  }
  Object.assign(headers, options.header || {});

  return new Promise((resolve, reject) => {
    wx.cloud.callContainer({
      config: {
        env: CLOUD_ENV_ID,
      },
      path,
      method: upper,
      header: headers,
      data: options.data == null ? undefined : options.data,
      dataType: options.dataType || "json",
      timeout: options.timeout || CALL_CONTAINER_TIMEOUT,
      success(res) {
        const sc = res.statusCode;
        const hdr = res.header || {};
        const diag = pickCloudRunDiagHeaders(hdr);
        logCloudContainerDiag(upper, {
          path,
          statusCode: sc,
          xCloudbaseRequestId: diag.xCloudbaseRequestId,
          xCloudbaseUpstreamStatusCode: diag.xCloudbaseUpstreamStatusCode,
          xCloudbaseUpstreamTimecost: diag.xCloudbaseUpstreamTimecost,
          xCloudbaseUpstreamType: diag.xCloudbaseUpstreamType,
        });
        const payload = normalizeContainerData(res.data, options.dataType);
        if (sc >= 200 && sc < 300) {
          resolve({
            statusCode: sc,
            data: payload,
            header: hdr,
          });
        } else {
          logCloudApiError("http_non_2xx", {
            path,
            method: upper,
            statusCode: sc,
            upstreamStatus: diag.xCloudbaseUpstreamStatusCode,
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
        logCloudContainerDiag(`${upper}_fail`, {
          path,
          errMsg: err && err.errMsg,
          errCode: err && err.errCode,
          errno: err && err.errno,
        });
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
/** 真机/非 mock 下保存目标分，冷启动与接口缺省时兜底 */
const USER_GOAL_LOCAL_KEY = "userGoalLocal";

function readUserGoalLocal() {
  try {
    const g = wx.getStorageSync(USER_GOAL_LOCAL_KEY);
    if (g != null && g !== "") {
      const n = Number(g);
      if (!Number.isNaN(n)) {
        return Math.max(0, Math.min(99, Math.round(n)));
      }
    }
  } catch (e) {
    /* ignore */
  }
  return null;
}

function persistUserGoalLocal(goal) {
  const n = Math.round(Number(goal));
  if (Number.isNaN(n)) return;
  try {
    wx.setStorageSync(
      USER_GOAL_LOCAL_KEY,
      Math.max(0, Math.min(99, n)),
    );
  } catch (e) {
    /* ignore */
  }
}

function readStoredMockGoal() {
  const local = readUserGoalLocal();
  if (local != null) return local;
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
  const n = (x) => Number(x) || 0;
  const map = {
    "slow-walk-panel":
      mode === "distance"
        ? `慢走，${n(payload.slowWalkDistance)}米`
        : `慢走，${n(payload.slowWalkTime)}min`,
    "fast-walk-panel":
      mode === "distance"
        ? `快走，${n(payload.fastWalkDistance)}米`
        : `快走，${n(payload.fastWalkTime)}min`,
    "jog-panel":
      mode === "distance"
        ? `慢跑，${n(payload.jogDistance)}米`
        : `慢跑，${n(payload.jogTime)}min`,
    "run-panel":
      mode === "distance"
        ? `跑步，${n(payload.runDistance)}米`
        : `跑步，${n(payload.runTime)}min`,
    "sit-overtime-panel": `久坐，${n(payload.sitOvertimeTime)}min`,
    "ride-panel":
      mode === "distance"
        ? `骑行，${n(payload.rideDistance)}米`
        : `骑行，${n(payload.rideTime)}min`,
  };
  return map[payload.panel] || "活动记录";
}

const FOOD_LABELS = {
  "vegetable-btn": "蔬菜",
  "protein-btn": "蛋白质",
  "light-btn": "清淡",
  "no-drink-btn": "食物低糖或不含糖",
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
  if (key === "no-drink-btn") {
    return FOOD_LABELS[key] || "食物低糖或不含糖";
  }
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
  const scorePayload =
    record.scorePayload != null && typeof record.scorePayload === "object"
      ? record.scorePayload
      : record.payload != null && typeof record.payload === "object"
        ? record.payload
        : null;
  const mod =
    record.module ||
    (doLabel === "活动" ? "act" : doLabel === "饮食" ? "eating" : doLabel === "睡眠" ? "sleep" : "");
  return {
    id: record.id,
    localId: record.localId,
    recordKind: record.recordKind,
    do: doLabel,
    time: timeStr,
    info: infoStr,
    module: mod,
    scoreDelta: (() => {
      if (record.scoreDelta == null || record.scoreDelta === "") {
        return undefined;
      }
      const n = Number(record.scoreDelta);
      return Number.isFinite(n) ? n : undefined;
    })(),
    scorePayload: scorePayload || undefined,
  };
}

function requestJson(path, method, data) {
  const p = path.startsWith("/") ? path : `/${path}`;
  const upper = (method || "GET").toUpperCase();
  if (upper === "GET" || upper === "HEAD") {
    return callCloudContainer(p, method, {}).then((r) => r.data);
  }
  return callCloudContainer(p, method, {
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
  const rawGoal = data.goal;
  let goal;
  if (rawGoal != null && rawGoal !== "" && Number.isFinite(Number(rawGoal))) {
    goal = Math.max(0, Math.min(99, Math.round(Number(rawGoal))));
    persistUserGoalLocal(goal);
  } else {
    const fallback = readUserGoalLocal();
    goal = fallback != null ? fallback : 80;
  }
  return {
    username: data.username != null ? data.username : "username",
    goal,
    duration: data.duration != null ? data.duration : 0,
  };
}

/** 解析 GET /records/recent 响应（兼容网关多包一层 data） */
function normalizeRecentListPayload(raw, depth = 0) {
  if (depth > 5 || raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    if (Array.isArray(raw.list)) return raw.list;
    if (raw.data != null) return normalizeRecentListPayload(raw.data, depth + 1);
  }
  return [];
}

async function fetchRecentActList(limit = 20) {
  if (useMock()) {
    await delay();
    return mockRecentList.slice(0, limit).map(mapRecordToRecentItem);
  }
  const raw = await requestJson(
    `/api/records/recent?limit=${encodeURIComponent(limit)}`,
    "GET",
  );
  const list = normalizeRecentListPayload(raw);
  if (!Array.isArray(list)) {
    return [];
  }
  return list.slice(0, limit).map(mapRecordToRecentItem);
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
        persistUserGoalLocal(g);
      }
    }
    return { success: true, payload };
  }
  const raw = await requestJson("/api/goal/save", "POST", payload);
  if (payload && payload.goal != null) {
    persistUserGoalLocal(payload.goal);
  }
  return raw && raw.data != null ? raw.data : raw;
}

function mockRecentRecordId() {
  return `m${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function computeMockListScoreDelta(moduleKey, scorePayload) {
  const p = scorePayload && typeof scorePayload === "object" ? scorePayload : {};
  if (moduleKey === "act") {
    return scoreUtil.calcActScore(p);
  }
  if (moduleKey === "sleep") {
    return scoreUtil.calcSleepScore(p);
  }
  const c = scoreUtil.getEatingCountsToday();
  const portions = scoreUtil.getEatingPortionCountsToday();
  const m = p.selectedMap || {};
  const overwhelm = scoreUtil.calcEatingOverwhelmMarginal(portions, m);
  return (
    scoreUtil.calcEatingScore({
      ...p,
      wineCountToday: p.wineCountToday != null ? p.wineCountToday : c.wine,
      milkCountToday: p.milkCountToday != null ? p.milkCountToday : c.milk,
      coffeeCountToday:
        p.coffeeCountToday != null ? p.coffeeCountToday : c.coffee,
    }) + overwhelm
  );
}

function pushMockRecent(
  moduleLabel,
  recordedAt,
  summary,
  scorePayload,
  moduleKey,
) {
  const delta = computeMockListScoreDelta(moduleKey, scorePayload);
  const item = {
    id: mockRecentRecordId(),
    do: moduleLabel,
    time: formatRecordedAtTimeOnly(recordedAt),
    info: summary,
    module: moduleKey,
    scoreDelta: delta,
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

function isNightSleepHighRateSource(record) {
  if (!record || typeof record !== "object") return false;
  const mod = record.module;
  const payload =
    record.scorePayload != null && typeof record.scorePayload === "object"
      ? record.scorePayload
      : record.payload;
  return mod === "sleep" && payload && payload.sleepMode === "night";
}

/** AI 识别夜间睡眠时长（小时，可小数）→ 与记分用 30 分钟粒度一致的展示文案 */
function formatAiNightSleepDurationText(decimalHours) {
  const totalMin = Math.round((Number(decimalHours) || 0) * (60 / 30)) * 30;
  const t = Math.max(0, Math.min(24 * 60, totalMin));
  const h = Math.floor(t / 60);
  const hm = t % 60 >= 30 ? 30 : 0;
  return hm ? `${h}小时${hm}分` : `${h}小时`;
}

/**
 * AI 分析记分后写入最近记录（仅本地 globalData / 页面 data，与后端 POST 无关）。
 * 每条带 localId / scoreDelta / module，可与其它记录一样删除并回滚。
 * detected.aiHints 来自 applyAiAnalyzeToApp：nightDelta、actDelta、oldNight、actWas、sleepParts
 */
function prependAiAnalyzeToRecentList(recentList, detected) {
  const ra = buildRecordedAt();
  const timeStr = formatRecordedAtTimeOnly(ra);
  const base = Array.isArray(recentList) ? recentList : [];
  const newRows = [];
  const h = detected && detected.aiHints ? detected.aiHints : null;
  const showSleepRow =
    h &&
    (detected.hadSleep || Number(h.nightDelta) !== 0);
  if (showSleepRow) {
    newRows.push({
      localId: `ai-s-${Date.now()}`,
      do: "睡眠",
      time: timeStr,
      info: detected.hadSleep
        ? formatAiNightSleepDurationText(detected.sleepHour)
        : "AI 夜间睡眠记分",
      module: "sleep",
      scoreDelta: h.nightDelta,
      recordKind: "aiSleep",
      scorePayload: {
        sleepMode: "night",
        sleepHour: h.sleepParts.sleepHour,
        sleepHalfHour: h.sleepParts.sleepHalfHour,
        _aiMeta: { oldNight: h.oldNight }
      }
    });
  }
  if (detected && detected.hadCalorie && h) {
    const c = Math.round(Number(detected.calorie) || 0);
    newRows.push({
      localId: `ai-c-${Date.now()}`,
      do: "活动消耗",
      time: timeStr,
      info: `消耗${c}卡路里`,
      module: "act",
      scoreDelta: h.actDelta,
      recordKind: "aiCalorie",
      scorePayload: { _aiMeta: { actWas: h.actWas } }
    });
  }
  if (detected && detected.hadSleep && !detected.hadCalorie && h && Number(h.actDelta) !== 0) {
    newRows.push({
      localId: `ai-a-${Date.now()}`,
      do: "活动",
      time: timeStr,
      info: "AI 分析（活动分）",
      module: "act",
      scoreDelta: h.actDelta,
      recordKind: "aiCalorie",
      scorePayload: { _aiMeta: { actWas: h.actWas } }
    });
  }
  return [...newRows, ...base].slice(0, 20);
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
      : record.payload != null && typeof record.payload === "object"
        ? record.payload
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
  const filtered = (list || []).filter((r) => !isNightSleepHighRateSource(r));
  const out = filtered.slice(0, 2).map(normalizeHighRateItem);
  while (out.length < 2) {
    out.push(emptyHighRateSlot());
  }
  return out;
}

function buildMockHighRateList() {
  const list = mockRecentList.filter((item) => !isNightSleepHighRateSource(item));
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
    const list = normalizeRecentListPayload(raw);
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
 * 选图 → 前端 OCR（外接 API 或 MOCK_OCR_TEXT）→ 后端 DeepSeek 解析文本
 * @param {string} filePath 本地临时路径
 */
/** 小程序 → 云托管 POST /api/feedback → 服务端写入 GitHub backend/feedback.md */
async function submitFeedback(payload) {
  const clampStar = (v) => {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n) || n < 1 || n > 10) return 0;
    return n;
  };
  const body =
    payload && typeof payload === "object"
      ? {
          text: payload.text != null ? String(payload.text) : "",
          coherent: clampStar(payload.coherent),
          valuable: clampStar(payload.valuable),
          flexible: clampStar(payload.flexible),
          label: Array.isArray(payload.label) ? payload.label : [],
        }
      : {
          text: "",
          coherent: 0,
          valuable: 0,
          flexible: 0,
          label: [],
        };
  if (useMock()) {
    await delay();
    return { success: true };
  }
  const raw = await requestJson("/api/feedback", "POST", body);
  return raw && raw.data != null ? raw.data : raw;
}

async function deleteRecordById(id) {
  if (useMock()) {
    await delay();
    const rid = String(id || "").trim();
    const idx = mockRecentList.findIndex((x) => String(x.id) === rid);
    if (idx < 0) {
      throw new Error("记录不存在");
    }
    const row = mockRecentList[idx];
    mockRecentList = mockRecentList.filter((_, i) => i !== idx);
    return {
      success: true,
      scoreDelta: Number(row.scoreDelta) || 0,
      module: row.module,
      payload: (row.scorePayload && { ...row.scorePayload }) || {},
    };
  }
  const raw = await requestJson(
    `/api/records/${encodeURIComponent(String(id).trim())}`,
    "DELETE",
  );
  const data = raw && raw.data != null ? raw.data : raw;
  return data && typeof data === "object"
    ? data
    : { success: false, message: "删除失败" };
}

async function uploadAiAnalyzeImage(filePath) {
  if (useMock()) {
    await delay();
    return { sleepHour: 7, calorie: 640 };
  }
  const ocrText = await extractTextFromImage(filePath);
  if (!ocrText || !String(ocrText).trim()) {
    throw new Error(
      '未识别到文字：请检查 utils/ocrConfig.js（OCR_PROVIDER / 合法域名 api.ocr.space），或 wx.setStorageSync("MOCK_OCR_TEXT","粘贴截图文字")',
    );
  }
  const raw = await callCloudContainer("/api/ai/analyze-text", "POST", {
    data: { ocrText: String(ocrText).trim() },
    timeout: 60000,
  });
  const payload = raw && raw.data != null ? raw.data : raw;
  return payload && typeof payload === "object" ? payload : {};
}

module.exports = {
  API_BASE,
  CLOUD_ENV_ID,
  CLOUD_SERVICE_NAME,
  CLOUD_API_PATH_PREFIX,
  DEBUG_CLOUD_CONTAINER,
  useMock,
  buildRecordedAt,
  formatRecordedAtDisplay,
  formatRecordedAtTimeOnly,
  buildActSummary,
  buildEatingSummary,
  buildSleepSummary,
  mapRecordToRecentItem,
  prependAiAnalyzeToRecentList,
  fetchUserDashboard,
  fetchRecentActList,
  fetchHighRateActList,
  fetchWeekProgress,
  saveGoal,
  saveActRecord,
  saveEatingRecord,
  saveSleepRecord,
  submitFeedback,
  uploadAiAnalyzeImage,
  deleteRecordById,
};
