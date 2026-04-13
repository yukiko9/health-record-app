const app = getApp();
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");
const { submitFeedback } = require("../../utils/api");

const README_ONCE_KEY = "healthUserReadmeShownV1";

const FEEDBACK_TAGS = [
  "便捷",
  "上手快",
  "实用",
  "满足日常需求",
  "UI美观",
  "有激励性",
  "活动类型对日常足够",
  "对此类应用感兴趣",
  "感到有可持续性",
  "缺乏专业性",
  "缺乏实用性",
  "缺乏激励性",
  "UI需要提升",
  "活动类型待完善",
  "不够满足日常需求",
  "计分规则需要更改",
];

const WORKFLOW_GRADE_UI_RESET = [
  { key: "coherent", label: "小程序使用逻辑通畅程度", value: 0 },
  {
    key: "valuable",
    label: "小程序功能价值度(是否觉得有用)",
    value: 0,
  },
  { key: "flexible", label: "操作方便/简易程度", value: 0 },
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
    feedbackVisible: false,
    feedbackText: "",
    feedbackTags: FEEDBACK_TAGS,
    feedbackSelected: {},
    workflowStarSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    workflowGradeUi: WORKFLOW_GRADE_UI_RESET.map((r) => ({ ...r })),
    scoreBump: false,
  },

  onShow() {
    const storedNick = wx.getStorageSync("wxUserNickname");
    if (storedNick) {
      app.globalData.username = storedNick;
    }
    const { scoreDisplay, scoreValue, username, goal, situation } =
      app.globalData;
    const patch = {
      score: scoreDisplay,
      username: app.globalData.username || username,
      goal,
      situation,
      moodEmoji: app.getMoodEmoji(scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(scoreValue),
      scoreBump: false,
    };
    try {
      if (!wx.getStorageSync(README_ONCE_KEY)) {
        patch.readmeVisible = true;
      }
    } catch (e) {
      /* ignore */
    }
    this.setData(patch);
    setTimeout(() => this.setData({ scoreBump: true }), 30);
    setTimeout(() => this.setData({ scoreBump: false }), 520);
  },

  noopReadme() {},

  openReadme() {
    this.setData({ readmeVisible: true });
  },

  closeReadme() {
    try {
      wx.setStorageSync(README_ONCE_KEY, true);
    } catch (e) {
      /* ignore */
    }
    this.setData({ readmeVisible: false });
  },

  noopFeedback() {},

  openFeedback() {
    this.setData({ feedbackVisible: true });
  },

  closeFeedback() {
    this.setData({
      feedbackVisible: false,
      feedbackText: "",
      feedbackSelected: {},
      workflowGradeUi: WORKFLOW_GRADE_UI_RESET.map((r) => ({ ...r })),
    });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackText: (e.detail && e.detail.value) || "" });
  },

  onWorkflowStarTap(e) {
    const key = e.currentTarget.dataset.rowKey;
    const n = Number(e.currentTarget.dataset.star);
    if (!key || !Number.isFinite(n) || n < 1 || n > 10) {
      return;
    }
    const ui = this.data.workflowGradeUi.map((row) =>
      row.key === key ? { ...row, value: n } : row,
    );
    this.setData({ workflowGradeUi: ui });
  },

  toggleFeedbackTag(e) {
    const tag = e.currentTarget.dataset.tag;
    if (!tag) return;
    const next = { ...this.data.feedbackSelected };
    if (next[tag]) {
      delete next[tag];
    } else {
      next[tag] = true;
    }
    this.setData({ feedbackSelected: next });
  },

  async submitFeedbackForm() {
    const text = (this.data.feedbackText || "").trim();
    const label = FEEDBACK_TAGS.filter((t) => this.data.feedbackSelected[t]);
    const scores = {};
    this.data.workflowGradeUi.forEach((r) => {
      scores[r.key] = r.value;
    });
    if (!scores.coherent || !scores.valuable || !scores.flexible) {
      wx.showToast({ title: "请完成三项 1～10 星评分", icon: "none" });
      return;
    }
    wx.showLoading({ title: "提交中", mask: true });
    try {
      await submitFeedback({
        text,
        coherent: scores.coherent,
        valuable: scores.valuable,
        flexible: scores.flexible,
        label,
      });
      wx.hideLoading();
      wx.showToast({ title: "感谢你的反馈", icon: "success" });
      this.closeFeedback();
    } catch (err) {
      wx.hideLoading();
      const msg = err && err.message ? String(err.message) : "提交失败，请重试";
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
      },
    });
  },

  enterMainUi() {
    wx.navigateTo({ url: "/pages/main-ui/index" });
  },
});
