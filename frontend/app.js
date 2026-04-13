const scoreUtil = require("./utils/score");

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
});

// // app.js 里先初始化
// wx.cloud.init({
//   env: "你的云开发环境ID",
// });
