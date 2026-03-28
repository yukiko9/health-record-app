Component({
  properties: {
    value: {
      type: Object,
      value: { jogTime: 10, jogDistance: 0 }
    },
    inputMode: { type: String, value: "time" },
    resetStamp: { type: Number, value: 0 }
  },

  data: {
    metricTouched: false,
    timeStr: "",
    distStr: ""
  },

  observers: {
    resetStamp() {
      this.setData({ metricTouched: false, timeStr: "", distStr: "" });
    },
    value(v) {
      if (!v) return;
      if (!this.data.metricTouched) return;
      this.setData({
        timeStr: v.jogTime != null && v.jogTime !== "" ? String(v.jogTime) : "",
        distStr: v.jogDistance != null && v.jogDistance !== "" ? String(v.jogDistance) : ""
      });
    }
  },

  methods: {
    stopBubble() {},
    onPickDistance() {
      const dist = (this.data.distStr || "").trim() === "" ? 0 : Number(this.data.distStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        jogTime: 0,
        jogDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const raw = (this.data.timeStr || "").trim();
      const t = raw === "" ? 10 : Number(this.data.timeStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        jogTime: t,
        jogDistance: 0,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        jogTime: 0,
        jogDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        jogTime: Number(timeStr) || 0,
        jogDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
