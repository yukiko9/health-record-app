const app = getApp();
const { saveSleepRecord, fetchRecentActList } = require("../../utils/api");
const { calcSleepScore: calcSleepScoreUtil } = require("../../utils/score");

function localDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nightTotalToParts(totalMin) {
  let t = Math.round(totalMin / 30) * 30;
  t = Math.max(0, Math.min(24 * 60, t));
  return {
    sleepHour: Math.floor(t / 60),
    sleepHalfHour: t % 60 >= 30 ? 30 : 0
  };
}

Page({
  data: {
    moodEmoji: "🙂",
    score: "60",
    sleepHour: 7,
    sleepHalfHour: 0,
    nightSleepLocked: false,
    scoreBump: false,
    sleepExitUp: false,
    sleepEnterPlay: false,
    sleepBuddyFloat: false,
    sleepHourBump: false
  },

  clearSleepUiTimers() {
    if (this._buddyTimer) {
      clearTimeout(this._buddyTimer);
      this._buddyTimer = null;
    }
  },

  onShow() {
    const { scoreDisplay, scoreValue } = app.globalData;
    const nightSleepLocked = wx.getStorageSync("nightSleepSavedDate") === localDateKey();
    this.clearSleepUiTimers();
    this.setData({
      score: scoreDisplay,
      moodEmoji: app.getMoodEmoji(scoreValue),
      nightSleepLocked,
      scoreBump: false,
      sleepExitUp: false,
      sleepEnterPlay: false,
      sleepBuddyFloat: false,
      sleepHourBump: false
    });
    setTimeout(() => this.setData({ scoreBump: true }), 30);
    setTimeout(() => this.setData({ scoreBump: false }), 520);
    this._buddyTimer = setTimeout(() => {
      this.setData({ sleepBuddyFloat: true });
    }, 1000);
    wx.nextTick(() => {
      this.setData({ sleepEnterPlay: true });
      setTimeout(() => this.setData({ sleepEnterPlay: false }), 600);
    });
  },

  onHide() {
    this.clearSleepUiTimers();
  },

  returnBtn() {
    wx.navigateBack();
  },

  switchSleepMode() {
    if (this._redirecting) return;
    this._redirecting = true;
    this.setData({ sleepExitUp: true });
    setTimeout(() => {
      wx.redirectTo({ url: "/pages/sleep-noon-block/index" });
      this._redirecting = false;
    }, 430);
  },

  onSleepHourBumpEnd() {
    this.setData({ sleepHourBump: false });
  },

  sleepHourReduce() {
    const cur = this.data.sleepHour * 60 + this.data.sleepHalfHour;
    this.setData({
      ...nightTotalToParts(cur - 30),
      sleepHourBump: true
    });
  },

  sleepHourAdd() {
    const cur = this.data.sleepHour * 60 + this.data.sleepHalfHour;
    this.setData({
      ...nightTotalToParts(cur + 30),
      sleepHourBump: true
    });
  },

  async sleepHalfHour() {
    if (this.data.nightSleepLocked) {
      wx.showToast({ title: "今日已记录过夜间睡眠", icon: "none" });
      return;
    }
    const payload = {
      sleepMode: "night",
      sleepHour: this.data.sleepHour,
      sleepHalfHour: this.data.sleepHalfHour
    };
    try {
      await saveSleepRecord(payload);
      const list = await fetchRecentActList(20);
      app.globalData.recentActList = list;
    } catch (err) {
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
      return;
    }
    const sleepScore = this.calcSleepScore(payload);
    const summary = app.setModuleScore("sleep", sleepScore);
    wx.setStorageSync("nightSleepScoreApplied", {
      date: localDateKey(),
      delta: sleepScore
    });
    wx.setStorageSync("nightSleepSavedDate", localDateKey());
    this.setData({
      score: summary.scoreDisplay,
      moodEmoji: app.getMoodEmoji(summary.scoreValue),
      nightSleepLocked: true
    });
    wx.showToast({ title: "夜间睡眠已保存", icon: "success" });
  },

  calcSleepScore(payload) {
    return calcSleepScoreUtil(payload);
  }
});
