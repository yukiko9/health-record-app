const app = getApp();
const { saveActRecord, fetchRecentActList } = require("../../utils/api");
const { calcActScore: calcActScoreUtil, localDateKey } = require("../../utils/score");
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");

function readSitAccum() {
  const key = localDateKey();
  const raw = wx.getStorageSync("sitDailyAccum") || {};
  if (raw.date !== key) return { date: key, total: 0 };
  return { date: key, total: Number(raw.total) || 0 };
}

Page({
  data: {
    pageBgStyle: "",
    score: "60",
    moodEmoji: "🙂",
    activePanel: "slow-walk-panel",
    actDataInput: {
      slowWalkTime: 10,
      slowWalkDistance: 0,
      fastWalkTime: 10,
      fastWalkDistance: 0,
      jogTime: 10,
      jogDistance: 0,
      runTime: 10,
      runDistance: 0,
      sitOvertimeTime: 30
    },
    actInputModes: {
      slowWalk: "time",
      fastWalk: "time",
      jog: "time",
      run: "time"
    },
    panelBump: false
  },

  onShow() {
    const { scoreDisplay, scoreValue } = app.globalData;
    this.setData({
      score: scoreDisplay,
      moodEmoji: app.getMoodEmoji(scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(scoreValue)
    });
  },

  returnBtn() {
    wx.navigateBack();
  },

  selectPanel(e) {
    const panel = e.currentTarget.dataset.panel;
    if (panel === this.data.activePanel) {
      this.setData({ panelBump: false });
      setTimeout(() => this.setData({ panelBump: true }), 0);
      return;
    }
    this.setData({
      activePanel: panel,
      panelBump: true
    });
  },

  onPanelBumpEnd() {
    this.setData({ panelBump: false });
  },

  onSlowWalkChange(e) {
    const d = e.detail;
    const modes = { ...this.data.actInputModes };
    if (d.actInputMode) modes.slowWalk = d.actInputMode;
    this.setData({
      actDataInput: { ...this.data.actDataInput, ...d },
      actInputModes: modes
    });
  },

  onFastWalkChange(e) {
    const d = e.detail;
    const modes = { ...this.data.actInputModes };
    if (d.actInputMode) modes.fastWalk = d.actInputMode;
    this.setData({
      actDataInput: { ...this.data.actDataInput, ...d },
      actInputModes: modes
    });
  },

  onJogChange(e) {
    const d = e.detail;
    const modes = { ...this.data.actInputModes };
    if (d.actInputMode) modes.jog = d.actInputMode;
    this.setData({
      actDataInput: { ...this.data.actDataInput, ...d },
      actInputModes: modes
    });
  },

  onRunChange(e) {
    const d = e.detail;
    const modes = { ...this.data.actInputModes };
    if (d.actInputMode) modes.run = d.actInputMode;
    this.setData({
      actDataInput: { ...this.data.actDataInput, ...d },
      actInputModes: modes
    });
  },

  onSitOvertimeChange(e) {
    this.setData({ actDataInput: { ...this.data.actDataInput, ...e.detail } });
  },

  resetActBtn() {
    this.setData({
      actDataInput: {
        slowWalkTime: 10,
        slowWalkDistance: 0,
        fastWalkTime: 10,
        fastWalkDistance: 0,
        jogTime: 10,
        jogDistance: 0,
        runTime: 10,
        runDistance: 0,
        sitOvertimeTime: 30
      },
      actInputModes: {
        slowWalk: "time",
        fastWalk: "time",
        jog: "time",
        run: "time"
      }
    });
  },

  async saveActBtn() {
    const p = this.data.activePanel;
    const modeByPanel = {
      "slow-walk-panel": this.data.actInputModes.slowWalk,
      "fast-walk-panel": this.data.actInputModes.fastWalk,
      "jog-panel": this.data.actInputModes.jog,
      "run-panel": this.data.actInputModes.run,
      "sit-overtime-panel": "time"
    };
    const payload = {
      panel: p,
      actInputMode: modeByPanel[p] || "time",
      ...this.data.actDataInput
    };
    if (p === "sit-overtime-panel") {
      const acc = readSitAccum();
      payload.sitDailyTotalBefore = acc.total;
    }
    try {
      await saveActRecord(payload);
      const list = await fetchRecentActList(20);
      app.globalData.recentActList = list;
    } catch (err) {
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
      return;
    }
    const actScore = this.calcActScore(payload);
    if (p === "sit-overtime-panel") {
      const t = Number(payload.sitOvertimeTime) || 0;
      const before = Number(payload.sitDailyTotalBefore) || 0;
      wx.setStorageSync("sitDailyAccum", { date: localDateKey(), total: before + t });
    }
    const summary = app.setModuleScore("act", actScore);
    this.setData({
      score: summary.scoreDisplay,
      moodEmoji: app.getMoodEmoji(summary.scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue)
    });
    if (p === "sit-overtime-panel" && actScore === 0) {
      wx.showToast({ title: "已保存，久坐未满300分钟未加分", icon: "none" });
    } else {
      wx.showToast({ title: "活动已保存", icon: "success" });
    }
    wx.navigateBack();
  },

  calcActScore(payload) {
    return calcActScoreUtil(payload);
  }
});
