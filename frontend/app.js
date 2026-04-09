App({
  onLaunch() {
    // A1/A2：在首屏页 require api 之前完成云初始化，避免 callContainer 未就绪（见 utils/api.js 顶部排查说明）
    if (typeof wx.cloud !== "undefined" && typeof wx.cloud.init === "function") {
      wx.cloud.init({
        env: "healthbook-6g0u9wm07f2a2e45",
        traceUser: true,
      });
    }
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
    this.recalcDailySummary();
  },

  /** 小程序内自定义字体：@font-face 在部分环境下不生效，需 loadFontFace + 根路径 /fonts/ */
  loadNunitoScoreFont() {
    if (typeof wx.loadFontFace !== "function") {
      return;
    }
    const load = (ext) => {
      wx.loadFontFace({
        family: "Nunito",
        global: true,
        source: `url("/fonts/Nunito-Bold.${ext}")`,
        desc: {
          style: "normal",
          weight: "700",
        },
        success() {},
        fail(err) {
          if (ext === "woff2") {
            load("woff");
          } else {
            console.warn("[loadFontFace] Nunito", err);
          }
        },
      });
    };
    load("woff2");
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

// app.js 里先初始化
wx.cloud.init({
  env: "你的云开发环境ID",
});
