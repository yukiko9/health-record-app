Component({
  properties: {
    value: {
      type: Object,
      value: { jogTime: 10, jogDistance: 1000 }
    },
    inputMode: { type: String, value: "time" }
  },

  data: {
    timeStr: "10",
    distStr: "1000"
  },

  observers: {
    value(v) {
      if (!v) return;
      this.setData({
        timeStr: v.jogTime != null && v.jogTime !== "" ? String(v.jogTime) : "0",
        distStr: v.jogDistance != null && v.jogDistance !== "" ? String(v.jogDistance) : "0"
      });
    }
  },

  methods: {
    stopBubble() {},
    onPickDistance() {
      const dist = Number(this.data.distStr) || 0;
      this.triggerEvent("change", {
        jogTime: 0,
        jogDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const t = Number(this.data.timeStr) || 0;
      this.triggerEvent("change", {
        jogTime: t,
        jogDistance: 0,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr });
      this.triggerEvent("change", {
        jogTime: 0,
        jogDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr });
      this.triggerEvent("change", {
        jogTime: Number(timeStr) || 0,
        jogDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
