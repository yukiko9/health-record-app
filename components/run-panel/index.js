Component({
  properties: {
    value: {
      type: Object,
      value: { runTime: 10, runDistance: 0 }
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
        timeStr: v.runTime != null && v.runTime !== "" ? String(v.runTime) : "",
        distStr: v.runDistance != null && v.runDistance !== "" ? String(v.runDistance) : ""
      });
    }
  },

  methods: {
    stopBubble() {},
    onPickDistance() {
      const dist = (this.data.distStr || "").trim() === "" ? 0 : Number(this.data.distStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        runTime: 0,
        runDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const raw = (this.data.timeStr || "").trim();
      const t = raw === "" ? 10 : Number(this.data.timeStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        runTime: t,
        runDistance: 0,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        runTime: 0,
        runDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        runTime: Number(timeStr) || 0,
        runDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
