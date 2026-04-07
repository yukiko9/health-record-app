Component({
  properties: {
    value: {
      type: Object,
      value: { rideTime: 0, rideDistance: 0 }
    },
    inputMode: {
      type: String,
      value: "time"
    },
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
        timeStr: v.rideTime != null && v.rideTime !== "" ? String(v.rideTime) : "",
        distStr: v.rideDistance != null && v.rideDistance !== "" ? String(v.rideDistance) : ""
      });
    }
  },

  methods: {
    stopBubble() {},

    onPickDistance() {
      const dist = (this.data.distStr || "").trim() === "" ? 0 : Number(this.data.distStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        rideTime: 0,
        rideDistance: dist,
        actInputMode: "distance"
      });
    },

    onPickTime() {
      const raw = (this.data.timeStr || "").trim();
      const t = raw === "" ? 0 : Number(this.data.timeStr) || 0;
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        rideTime: t,
        rideDistance: 0,
        actInputMode: "time"
      });
    },

    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        rideTime: 0,
        rideDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },

    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        rideTime: Number(timeStr) || 0,
        rideDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
