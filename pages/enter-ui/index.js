const app = getApp();
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");

Page({
  data: {
    score: "60",
    username: "username",
    goal: 80,
    situation: "未完成",
    moodEmoji: "🙂",
    pageBgStyle: "",
    readmeVisible: false,
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
