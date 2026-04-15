const scoreUtil = require("./utils/score");
const { computeRecordRevertDelta } = require("./utils/revertRecordDelta");

const DAILY_GLOBAL_SCORE_KEY = "dailyGlobalScoreV1";

App({
  onLaunch() {
    wx.cloud.init({
      env: "prod-5g4vryi1618f27a5",
      traceUser: true,
    });
    this.loadNunitoScoreFont();
    try {
      const g = wx.getStorageSync("mockUserGoal");
      if (g != null && g !== "") {
        const n = Math.max(0, Math.min(99, Math.round(Number(g))));
        if (!Number.isNaN(n)) {
          this.globalData.goal = n;
        }
      }
    } catch (e) {
      /* ignore */
    }
    try {
      const ug = wx.getStorageSync("userGoalLocal");
      if (ug != null && ug !== "") {
        const n = Math.max(0, Math.min(99, Math.round(Number(ug))));
        if (!Number.isNaN(n)) {
          this.globalData.goal = n;
        }
      }
    } catch (e) {
      /* ignore */
    }
    this.restoreDailyScoreIfSameDay();
    this.recalcDailySummary();
  },

  /** 小程序内自定义字体：@font-face 在部分环境下不生效，需 loadFontFace + 根路径 /fonts/ */
  loadNunitoScoreFont() {
    if (typeof wx.loadFontFace !== "function") {
      return;
    }
    wx.loadFontFace({
      family: "NunitoDigits",
      global: true,
      source: 'url("/fonts/Nunito-Digits.woff2")',
      desc: {
        style: "normal",
        weight: "700",
      },
      success() {},
      fail(err) {
        console.warn("[loadFontFace] NunitoDigits", err);
      },
    });
  },

  globalData: {
    username: "username",
    goal: 80,
    scoreValue: 60,
    scoreDisplay: "60",
    situation: "未完成",
    duration: 0,
    moduleDone: {
      act: false,
      eating: false,
      sleep: false,
    },
    moduleScore: {
      act: 0,
      eating: 0,
      sleep: 0,
    },
    recentActList: [],
    /** 主界面高频记录：用于接口偶发空数据时保留上次有效列表 */
    highRateActList: [],
  },

  /** 退出再进（同日冷启动）时恢复当日全局分与模块累计，与 utils/score.localDateKey 对齐 */
  restoreDailyScoreIfSameDay() {
    try {
      const today = scoreUtil.localDateKey();
      const raw = wx.getStorageSync(DAILY_GLOBAL_SCORE_KEY);
      if (!raw || typeof raw !== "object" || raw.dateKey !== today) {
        return;
      }
      if (typeof raw.scoreValue === "number" && !Number.isNaN(raw.scoreValue)) {
        this.globalData.scoreValue = Math.max(
          0,
          Math.min(100, Math.round(raw.scoreValue)),
        );
      }
      if (raw.moduleScore && typeof raw.moduleScore === "object") {
        this.globalData.moduleScore = {
          act: Number(raw.moduleScore.act) || 0,
          eating: Number(raw.moduleScore.eating) || 0,
          sleep: Number(raw.moduleScore.sleep) || 0,
        };
      }
      if (raw.moduleDone && typeof raw.moduleDone === "object") {
        this.globalData.moduleDone = {
          act: !!raw.moduleDone.act,
          eating: !!raw.moduleDone.eating,
          sleep: !!raw.moduleDone.sleep,
        };
      }
    } catch (e) {
      /* ignore */
    }
  },

  persistDailyScoreState() {
    try {
      const dateKey = scoreUtil.localDateKey();
      wx.setStorageSync(DAILY_GLOBAL_SCORE_KEY, {
        dateKey,
        scoreValue: this.globalData.scoreValue,
        moduleScore: { ...this.globalData.moduleScore },
        moduleDone: { ...this.globalData.moduleDone },
      });
    } catch (e) {
      /* ignore */
    }
  },

  getMoodEmoji(score) {
    if (typeof score !== "number") return "🙂";
    if (score <= 20) return "🤒";
    if (score <= 40) return "😰";
    if (score <= 50) return "🤧";
    if (score <= 60) return "😳";
    if (score <= 70) return "😌";
    if (score <= 80) return "😊";
    if (score <= 90) return "😋";
    if (score <= 99) return "😆";
    return "😎";
  },

  recalcDailySummary() {
    let v = this.globalData.scoreValue;
    if (typeof v !== "number" || Number.isNaN(v)) {
      v = 60;
    }
    v = Math.max(0, Math.min(100, Math.round(v)));
    this.globalData.scoreValue = v;
    this.globalData.scoreDisplay = String(v);
    this.globalData.situation = v >= this.globalData.goal ? "已完成" : "未完成";
    this.persistDailyScoreState();
    return {
      scoreValue: this.globalData.scoreValue,
      scoreDisplay: this.globalData.scoreDisplay,
      situation: this.globalData.situation,
    };
  },

  /** 将本条模块计算分叠加到全局 score（0–100），并记录模块完成态 */
  setModuleScore(module, score) {
    const d = Number(score) || 0;
    let v =
      typeof this.globalData.scoreValue === "number"
        ? this.globalData.scoreValue
        : 60;
    v = Math.max(0, Math.min(100, Math.round(v + d)));
    this.globalData.scoreValue = v;
    this.globalData.moduleScore[module] =
      (this.globalData.moduleScore[module] || 0) + d;
    this.globalData.moduleDone[module] = true;
    return this.recalcDailySummary();
  },

  /** 高频快捷区等：将 delta 叠加到全局 score */
  addModuleScoreDelta(module, delta) {
    const d = Number(delta) || 0;
    let v =
      typeof this.globalData.scoreValue === "number"
        ? this.globalData.scoreValue
        : 60;
    v = Math.max(0, Math.min(100, Math.round(v + d)));
    this.globalData.scoreValue = v;
    this.globalData.moduleScore[module] =
      (this.globalData.moduleScore[module] || 0) + d;
    this.globalData.moduleDone[module] = true;
    return this.recalcDailySummary();
  },

  /**
   * 删除一条「最近活动」记录时回滚当日全局分、模块分及与计分相关的本地累计。
   * @param {{ module?: string, scoreDelta?: number, scorePayload?: object }} item
   */
  revertRecordedScoreDelta(item) {
    const module = item && item.module;
    const d = Number(computeRecordRevertDelta(item)) || 0;
    if (!module) {
      return this.recalcDailySummary();
    }
    let v =
      typeof this.globalData.scoreValue === "number"
        ? this.globalData.scoreValue
        : 60;
    v = Math.max(0, Math.min(100, Math.round(v - d)));
    this.globalData.scoreValue = v;
    const cur = Number(this.globalData.moduleScore[module]) || 0;
    this.globalData.moduleScore[module] = Math.max(0, cur - d);

    const payload = (item && item.scorePayload) || {};
    if (module === "act" && payload.panel === "sit-overtime-panel") {
      const t = Number(payload.sitOvertimeTime) || 0;
      const key = scoreUtil.localDateKey();
      try {
        const acc = wx.getStorageSync("sitDailyAccum") || {};
        if (acc.date === key && t > 0) {
          const total = Math.max(0, (Number(acc.total) || 0) - t);
          wx.setStorageSync("sitDailyAccum", { date: key, total });
        }
      } catch (e) {
        /* ignore */
      }
    }

    if (module === "eating") {
      const m = payload.selectedMap || {};
      try {
        const key = scoreUtil.localDateKey();
        const raw = wx.getStorageSync("eatingDailyBtnCounts") || {};
        if (raw.date !== key) {
          return this.recalcDailySummary();
        }
        const patch = { ...raw, date: key };
        if (m["drink-wine-btn"]) {
          patch.wine = Math.max(0, (Number(patch.wine) || 0) - 1);
        }
        if (m["drink-milk-btn"]) {
          patch.milk = Math.max(0, (Number(patch.milk) || 0) - 1);
        }
        if (m["coffee-btn"]) {
          patch.coffee = Math.max(0, (Number(patch.coffee) || 0) - 1);
        }
        if (m["vegetable-btn"]) {
          patch.vegetable = Math.max(0, (Number(patch.vegetable) || 0) - 1);
        }
        if (m["fruit-btn"]) {
          patch.fruit = Math.max(0, (Number(patch.fruit) || 0) - 1);
        }
        if (m["protein-btn"]) {
          patch.protein = Math.max(0, (Number(patch.protein) || 0) - 1);
        }
        wx.setStorageSync("eatingDailyBtnCounts", patch);
      } catch (e) {
        /* ignore */
      }
    }

    if (item.recordKind === "aiSleep" && payload._aiMeta) {
      try {
        const key = scoreUtil.localDateKey();
        const on = payload._aiMeta.oldNight;
        wx.setStorageSync("nightSleepScoreApplied", {
          date: key,
          delta: Number(on) || 0
        });
      } catch (e) {
        /* ignore */
      }
    }

    if (module === "sleep" && payload.sleepMode === "noon") {
      try {
        const key = scoreUtil.localDateKey();
        const raw = wx.getStorageSync("noonSleepSaves") || {};
        if (raw.date === key) {
          wx.setStorageSync("noonSleepSaves", {
            date: key,
            count: Math.max(0, (Number(raw.count) || 0) - 1),
          });
        }
      } catch (e) {
        /* ignore */
      }
    }

    return this.recalcDailySummary();
  },
});

// // app.js 里先初始化
// wx.cloud.init({
//   env: "你的云开发环境ID",
// });
