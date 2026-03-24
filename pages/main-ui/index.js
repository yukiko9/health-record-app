const app = getApp();
const { fetchUserDashboard, fetchHighRateActList, fetchWeekProgress } = require("../../utils/api");
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
    recordDayModalEmoji: "🙂"
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
      pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue)
    });
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
      delta = scoreUtil.calcEatingScore({
        ...item.scorePayload,
        wineCountToday: c.wine,
        milkCountToday: c.milk
      });
    } else if (item.module === "sleep") {
      delta = scoreUtil.calcSleepScore(item.scorePayload);
    }
    const summary = app.addModuleScoreDelta(item.module, delta);
    this.setData({
      score: summary.scoreDisplay,
      situation: summary.situation,
      moodEmoji: app.getMoodEmoji(summary.scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue)
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
  }
});
