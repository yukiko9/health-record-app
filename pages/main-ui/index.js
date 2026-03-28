const app = getApp();
const {
  fetchUserDashboard,
  fetchHighRateActList,
  fetchWeekProgress,
  uploadAiAnalyzeImage
} = require("../../utils/api");
const { applyAiAnalyzeToApp } = require("../../utils/aiApply");
const scoreUtil = require("../../utils/score");
const { buildFiveDaySlots, mergeWeekApi, dateKeyFromDate } = require("../../utils/weekUi");
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");

Page({
  data: {
    pageBgStyle: "",
    moodEmoji: "🙂",
    score: "60",
    username: "username",
    goal: 80,
    situation: "未完成",
    duration: 0,
    recentActList: [],
    highRateActList: [],
    showRecentActList: true,
    weekDays: [],
    recordDayModalVisible: false,
    recordDayModalTitle: "",
    recordDayModalScore: "",
    recordDayModalWon: false,
    recordDayModalEmoji: "🙂",
    scoreBump: false,
    todayGoalMet: false
  },

  async onShow() {
    await this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const dashboard = await fetchUserDashboard();
      const storedNick = wx.getStorageSync("wxUserNickname");
      app.globalData.username = storedNick || dashboard.username;
      app.globalData.goal = dashboard.goal;
      app.globalData.duration = dashboard.duration;
      app.globalData.recentActList = dashboard.recentActList || [];
    } catch (err) {
      app.globalData.recentActList = app.globalData.recentActList || [];
      wx.showToast({ title: "加载失败，请检查网络", icon: "none" });
    }
    const summary = app.recalcDailySummary();
    const highRateActList = await fetchHighRateActList(2);
    let weekDays = mergeWeekApi(buildFiveDaySlots(), (await fetchWeekProgress()).days);
    if (app.globalData.goal != null) {
      const key = dateKeyFromDate(new Date());
      const map = { ...(wx.getStorageSync("mockWeekDayMap") || {}) };
      map[key] = {
        won: summary.scoreValue >= app.globalData.goal,
        score: summary.scoreValue,
        goal: app.globalData.goal
      };
      wx.setStorageSync("mockWeekDayMap", map);
      weekDays = mergeWeekApi(buildFiveDaySlots(), map);
    }
    const todayGoalMet =
      typeof summary.scoreValue === "number" &&
      typeof app.globalData.goal === "number" &&
      summary.scoreValue >= app.globalData.goal;
    this.setData({
      username: app.globalData.username,
      goal: app.globalData.goal,
      duration: app.globalData.duration,
      recentActList: app.globalData.recentActList,
      highRateActList,
      weekDays,
      score: summary.scoreDisplay,
      situation: summary.situation,
      moodEmoji: app.getMoodEmoji(summary.scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue),
      scoreBump: false,
      todayGoalMet
    });
    setTimeout(() => this.setData({ scoreBump: true }), 30);
    setTimeout(() => this.setData({ scoreBump: false }), 520);
  },

  onRecordDayTap(e) {
    const key = e.currentTarget.dataset.key;
    const item = (this.data.weekDays || []).find((x) => x.dateKey === key);
    if (!item || item.isFuture) {
      return;
    }
    if (!item.hasRecord) {
      wx.showToast({ title: "该日暂无记录", icon: "none" });
      return;
    }
    this.setData({
      recordDayModalVisible: true,
      recordDayModalTitle: `${item.labelEn} ${item.labelZh}`,
      recordDayModalScore: String(item.score),
      recordDayModalWon: !!item.won,
      recordDayModalEmoji: item.won ? "😊" : "👻"
    });
  },

  closeRecordDayModal() {
    this.setData({ recordDayModalVisible: false });
  },

  noopModal() {},

  onHighRateActTap(e) {
    const idx = Number(e.currentTarget.dataset.index);
    const item = (this.data.highRateActList || [])[idx];
    if (!item || !item.valid || !item.module || !item.scorePayload) {
      return;
    }
    let delta = 0;
    if (item.module === "act") {
      delta = scoreUtil.calcActScore(item.scorePayload);
    } else if (item.module === "eating") {
      const c = scoreUtil.getEatingCountsToday();
      const portions = scoreUtil.getEatingPortionCountsToday();
      const m = item.scorePayload.selectedMap || {};
      const overwhelmMarginal = scoreUtil.calcEatingOverwhelmMarginal(portions, m);
      delta =
        scoreUtil.calcEatingScore({
          ...item.scorePayload,
          wineCountToday: c.wine,
          milkCountToday: c.milk,
          coffeeCountToday: c.coffee,
          milkteaSugar: item.scorePayload.milkteaSugar
        }) + overwhelmMarginal;
      let nw = c.wine;
      let nm = c.milk;
      let nc = c.coffee;
      if (m["drink-wine-btn"]) nw += 1;
      if (m["drink-milk-btn"]) nm += 1;
      if (m["coffee-btn"]) nc += 1;
      const afterPortions = scoreUtil.eatingPortionsAfterSave(portions, m);
      wx.setStorageSync("eatingDailyBtnCounts", {
        date: scoreUtil.localDateKey(),
        wine: nw,
        milk: nm,
        coffee: nc,
        vegetable: afterPortions.vegetable,
        fruit: afterPortions.fruit,
        protein: afterPortions.protein
      });
    } else if (item.module === "sleep") {
      delta = scoreUtil.calcSleepScore(item.scorePayload);
    }
    const summary = app.addModuleScoreDelta(item.module, delta);
    const todayGoalMet =
      typeof summary.scoreValue === "number" &&
      typeof app.globalData.goal === "number" &&
      summary.scoreValue >= app.globalData.goal;
    this.setData({
      score: summary.scoreDisplay,
      situation: summary.situation,
      moodEmoji: app.getMoodEmoji(summary.scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue),
      todayGoalMet
    });
    wx.showToast({ title: "已记分", icon: "success" });
  },

  toggleRecentActList() {
    this.setData({ showRecentActList: !this.data.showRecentActList });
  },

  goGoalSetting() {
    wx.navigateTo({ url: "/pages/goal-setting/index" });
  },

  goActBlock() {
    wx.navigateTo({ url: "/pages/act-block/index" });
  },

  goEatingBlock() {
    wx.navigateTo({ url: "/pages/eating-block/index" });
  },

  goSleepBlock() {
    wx.navigateTo({ url: "/pages/sleep-night-block/index" });
  },

  onAiAnalyzeTap() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      success: async (pick) => {
        const f = pick.tempFiles && pick.tempFiles[0];
        if (!f || !f.tempFilePath) {
          return;
        }
        wx.showLoading({ title: "分析中…", mask: true });
        let raw;
        try {
          raw = await uploadAiAnalyzeImage(f.tempFilePath);
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: "上传失败，请重试", icon: "none" });
          return;
        }
        wx.hideLoading();

        let sleepHour = raw.sleepHour;
        let calorie = raw.calorie;
        const missS = sleepHour === undefined || sleepHour === null;
        const missC = calorie === undefined || calorie === null;
        if (missS && missC) {
          wx.showModal({
            title: "提示",
            content: "未检测到有效睡眠和活动热量值，请重新上传截图！",
            showCancel: false
          });
          return;
        }
        if (missS) {
          sleepHour = 0;
          wx.showToast({ title: "只获取到活动热量值！", icon: "none" });
        } else if (missC) {
          calorie = 0;
          wx.showToast({ title: "只获取到睡眠时间！", icon: "none" });
        }

        const summary = applyAiAnalyzeToApp(app, sleepHour, calorie);
        const todayGoalMet =
          typeof summary.scoreValue === "number" &&
          typeof app.globalData.goal === "number" &&
          summary.scoreValue >= app.globalData.goal;
        this.setData({
          score: summary.scoreDisplay,
          situation: summary.situation,
          moodEmoji: app.getMoodEmoji(summary.scoreValue),
          pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue),
          todayGoalMet
        });
        wx.showToast({ title: "已更新分数", icon: "success" });
      },
      fail() {}
    });
  }
});
