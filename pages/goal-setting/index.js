const app = getApp();
const { saveGoal } = require("../../utils/api");
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");

Page({
  data: {
    pageBgStyle: "",
    score: "60",
    goal: 0,
    goalTenDigits: 0,
    goalSingleDigits: 0,
    goalDigitTarget: "single"
  },

  onShow() {
    const { scoreDisplay, goal, scoreValue } = app.globalData;
    this.setData({
      score: scoreDisplay,
      goal,
      goalTenDigits: Math.floor(goal / 10),
      goalSingleDigits: goal % 10,
      pageBgStyle: getScorePageBackgroundStyle(scoreValue)
    });
  },

  selectGoalDigitTen() {
    this.setData({ goalDigitTarget: "ten" });
  },

  selectGoalDigitSingle() {
    this.setData({ goalDigitTarget: "single" });
  },

  goalReduce() {
    const step = this.data.goalDigitTarget === "ten" ? 10 : 1;
    const next = Math.max(0, this.data.goal - step);
    this.updateGoalDigits(next);
  },

  goalAdd() {
    const step = this.data.goalDigitTarget === "ten" ? 10 : 1;
    const next = Math.min(99, this.data.goal + step);
    this.updateGoalDigits(next);
  },

  updateGoalDigits(goal) {
    this.setData({
      goal,
      goalTenDigits: Math.floor(goal / 10),
      goalSingleDigits: goal % 10
    });
  },

  async saveGoalBtn() {
    const payload = { goal: this.data.goal };
    try {
      await saveGoal(payload);
    } catch (err) {
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
      return;
    }
    app.globalData.goal = this.data.goal;
    app.recalcDailySummary();
    wx.showToast({ title: "已保存", icon: "success" });
    wx.navigateBack();
  },

  returnBtn() {
    wx.navigateBack();
  }
});
