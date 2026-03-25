const app = getApp();
const { saveEatingRecord, fetchRecentActList } = require("../../utils/api");
const {
  calcEatingScore: calcEatingScoreUtil,
  localDateKey,
  getEatingCountsToday,
  getEatingPortionCountsToday,
  calcEatingOverwhelmMarginal,
  eatingPortionsAfterSave
} = require("../../utils/score");
const { getScorePageBackgroundStyle } = require("../../utils/pageBg");

Page({
  data: {
    pageBgStyle: "",
    score: "60",
    moodEmoji: "🙂",
    activePanel: "balanced-food-panel",
    fullness: 3,
    selectedMap: {
      "vegetable-btn": false,
      "protein-btn": false,
      "light-btn": false,
      "no-drink-btn": false,
      "junk-btn": false,
      "drink-btn": false,
      "drink-wine-btn": false,
      "drink-water-btn": false,
      "fruit-btn": false,
      "drink-milk-btn": false
    }
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
  
  onToggleItem(e) {
    const { key } = e.detail;
    const selectedMap = { ...this.data.selectedMap, [key]: !this.data.selectedMap[key] };
    this.setData({ selectedMap });
  },

  onFullnessChange(e) {
    const fullness = Math.min(5, Math.max(1, this.data.fullness + e.detail.delta));
    this.setData({ fullness });
  },

  resetEatBtn() {
    const resetMap = {};
    Object.keys(this.data.selectedMap).forEach((k) => {
      resetMap[k] = false;
    });
    this.setData({ selectedMap: resetMap, fullness: 3 });
  },

  async saveEatBtn() {
    const counts = getEatingCountsToday();
    const payload = {
      panel: this.data.activePanel,
      selectedMap: this.data.selectedMap,
      fullness: this.data.fullness,
      wineCountToday: counts.wine,
      milkCountToday: counts.milk
    };
    try {
      await saveEatingRecord(payload);
      const list = await fetchRecentActList(20);
      app.globalData.recentActList = list;
    } catch (err) {
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
      return;
    }
    const portions = getEatingPortionCountsToday();
    const overwhelmMarginal = calcEatingOverwhelmMarginal(portions, this.data.selectedMap);
    const eatingScore = this.calcEatingScore(payload) + overwhelmMarginal;
    let nw = counts.wine;
    let nm = counts.milk;
    if (this.data.selectedMap["drink-wine-btn"]) nw += 1;
    if (this.data.selectedMap["drink-milk-btn"]) nm += 1;
    const afterPortions = eatingPortionsAfterSave(portions, this.data.selectedMap);
    wx.setStorageSync("eatingDailyBtnCounts", {
      date: localDateKey(),
      wine: nw,
      milk: nm,
      vegetable: afterPortions.vegetable,
      fruit: afterPortions.fruit,
      protein: afterPortions.protein
    });
    const summary = app.setModuleScore("eating", eatingScore);
    this.setData({
      score: summary.scoreDisplay,
      moodEmoji: app.getMoodEmoji(summary.scoreValue),
      pageBgStyle: getScorePageBackgroundStyle(summary.scoreValue)
    });
    wx.showToast({ title: "饮食已保存", icon: "success" });
    wx.navigateBack();
  },

  calcEatingScore(payload) {
    return calcEatingScoreUtil(payload);
  }
});
