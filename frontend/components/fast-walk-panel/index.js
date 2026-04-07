Component({
  properties: {
    value: {
      type: Object,
      value: { fastWalkTime: 0, fastWalkDistance: 0 }
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
        timeStr:
          v.fastWalkTime != null && v.fastWalkTime !== "" ? String(v.fastWalkTime) : "",
        distStr:
          v.fastWalkDistance != null && v.fastWalkDistance !== ""
            ? String(v.fastWalkDistance)
            : ""
      });
    }
  },

  methods: {
    stopBubble() {},
    onPickDistance() {
      const dist = (this.data.distStr || "").trim() === "" ? 0 : Number(this.data.distStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: 0,
        fastWalkDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const raw = (this.data.timeStr || "").trim();
      const t = raw === "" ? 0 : Number(this.data.timeStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: t,
        fastWalkDistance: 0,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: 0,
        fastWalkDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: Number(timeStr) || 0,
        fastWalkDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
