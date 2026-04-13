const app = getApp();
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");
const { submitEvaluation } = require("../../utils/api");

const EVALUATION_TAGS = [
  "便捷",
  "上手快",
  "实用",
  "满足日常需求",
  "UI美观",
  "活动类型对日常足够",
  "对此类应用感兴趣",
  "感到有可持续性",
  "缺乏专业性",
  "缺乏实用性",
  "UI需要提升",
  "活动类型待完善",
  "不够满足日常需求"
];

Page({
  data: {
    score: "60",
    username: "username",
    goal: 80,
    situation: "未完成",
    moodEmoji: "🙂",
    pageBgStyle: "",
    readmeVisible: false,
    evaluationVisible: false,
    evaluationText: "",
    evaluationTags: EVALUATION_TAGS,
    evalSelected: {},
    scoreBump: false
  },

  onShow() {
    const storedNick = wx.getStorageSync("wxUserNickname");
    if (storedNick) {
      app.globalData.username = storedNick;
    }
    const { scoreDisplay, scoreValue, username, goal, situation } = app.globalData;
    this.setData({
      score: scoreDisplay,
      username: app.globalData.username || username,
      goal,
      situation,
      moodEmoji: app.getMoodEmoji(scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(scoreValue),
      scoreBump: false
    });
    setTimeout(() => this.setData({ scoreBump: true }), 30);
    setTimeout(() => this.setData({ scoreBump: false }), 520);
  },

  noopReadme() {},

  openReadme() {
    this.setData({ readmeVisible: true });
  },

  closeReadme() {
    this.setData({ readmeVisible: false });
  },

  noopEvaluation() {},

  openEvaluation() {
    this.setData({ evaluationVisible: true });
  },

  closeEvaluation() {
    this.setData({
      evaluationVisible: false,
      evaluationText: "",
      evalSelected: {}
    });
  },

  onEvaluationInput(e) {
    this.setData({ evaluationText: (e.detail && e.detail.value) || "" });
  },

  toggleEvalTag(e) {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    const next = { ...this.data.evalSelected };
    if (next[tag]) {
      delete next[tag];
    } else {
      next[tag] = true;
    }
    this.setData({ evalSelected: next });
  },

  async submitEvaluationForm() {
    const text = (this.data.evaluationText || "").trim();
    const label = EVALUATION_TAGS.filter((t) => this.data.evalSelected[t]);
    if (!text.length && !label.length) {
      wx.showToast({ title: "请填写反馈或选择标签", icon: "none" });
      return;
    }
    wx.showLoading({ title: "提交中", mask: true });
    try {
      await submitEvaluation({ text, label });
      wx.hideLoading();
      wx.showToast({ title: "感谢你的反馈", icon: "success" });
      this.closeEvaluation();
    } catch (err) {
      wx.hideLoading();
      const msg =
        err && err.message ? String(err.message) : "提交失败，请重试";
      wx.showToast({ title: msg, icon: "none" });
    }
  },

  syncWechatNickname() {
    wx.getUserProfile({
      desc: "用于在首页展示你的微信昵称",
      success: (res) => {
        const name = (res.userInfo && res.userInfo.nickName) || "微信用户";
        wx.setStorageSync("wxUserNickname", name);
        app.globalData.username = name;
        this.setData({ username: name });
        wx.showToast({ title: "已同步昵称", icon: "success" });
      },
      fail: () => {
        wx.showToast({ title: "未授权昵称", icon: "none" });
      }
    });
  },

  enterMainUi() {
    wx.navigateTo({ url: "/pages/main-ui/index" });
  }
});
