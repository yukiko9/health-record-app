const app = getApp();
const { saveSleepRecord, fetchRecentActList } = require("../../utils/api");
const { calcSleepScore: calcSleepScoreUtil, getNoonSleepSavesToday, localDateKey } = require("../../utils/score");

function noonTotalToParts(totalMin) {
  let t = Math.round(totalMin / 30) * 30;
  const maxMin = 6 * 60 + 30;
  t = Math.max(0, Math.min(maxMin, t));
  return {
    sleepHour: Math.floor(t / 60),
    sleepHalfHour: t % 60 >= 30 ? 30 : 0
  };
}

Page({
  data: {
    moodEmoji: "🙂",
    score: "60",
    sleepHour: 1,
    sleepHalfHour: 0,
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
    this.clearSleepUiTimers();
    this.setData({
      score: scoreDisplay,
      moodEmoji: app.getMoodEmoji(scoreValue),
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
      wx.redirectTo({ url: "/pages/sleep-night-block/index" });
      this._redirecting = false;
    }, 430);
  },

  onSleepHourBumpEnd() {
    this.setData({ sleepHourBump: false });
  },

  sleepHourReduce() {
    const cur = this.data.sleepHour * 60 + this.data.sleepHalfHour;
    this.setData({
      ...noonTotalToParts(cur - 30),
      sleepHourBump: true
    });
  },

  sleepHourAdd() {
    const cur = this.data.sleepHour * 60 + this.data.sleepHalfHour;
    this.setData({
      ...noonTotalToParts(cur + 30),
      sleepHourBump: true
    });
  },

  async sleepHalfHour() {
    const noonSleepSavesBefore = getNoonSleepSavesToday();
    const payload = {
      sleepMode: "noon",
      sleepHour: this.data.sleepHour,
      sleepHalfHour: this.data.sleepHalfHour,
      noonSleepSavesBefore
    };
    try {
      await saveSleepRecord(payload);
      const list = await fetchRecentActList(20);
      app.globalData.recentActList = list;
    } catch (err) {
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
      return;
    }
    wx.setStorageSync("noonSleepSaves", {
      date: localDateKey(),
      count: noonSleepSavesBefore + 1
    });
    const sleepScore = this.calcSleepScore(payload);
    const summary = app.setModuleScore("sleep", sleepScore);
    this.setData({
      score: summary.scoreDisplay,
      moodEmoji: app.getMoodEmoji(summary.scoreValue)
    });
    wx.showToast({ title: "午睡已保存", icon: "success" });
  },

  calcSleepScore(payload) {
    return calcSleepScoreUtil(payload);
  }
});
