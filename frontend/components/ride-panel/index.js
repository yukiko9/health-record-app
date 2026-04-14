const { metricFromInput, sanitizeIntString } = require("../../utils/actInput");

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
      const dist = metricFromInput(this.data.distStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        rideTime: null,
        rideDistance: dist,
        actInputMode: "distance"
      });
    },

    onPickTime() {
      const t = metricFromInput(this.data.timeStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        rideTime: t,
        rideDistance: null,
        actInputMode: "time"
      });
    },

    onDistanceInput(e) {
      const distStr = sanitizeIntString(e.detail.value);
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        rideTime: null,
        rideDistance: metricFromInput(distStr),
        actInputMode: "distance"
      });
    },

    onTimeInput(e) {
      const timeStr = sanitizeIntString(e.detail.value);
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        rideTime: metricFromInput(timeStr),
        rideDistance: null,
        actInputMode: "time"
      });
    }
  }
});
