const { metricFromInput, sanitizeIntString } = require("../../utils/actInput");

Component({
  properties: {
    value: {
      type: Object,
      value: { runTime: 0, runDistance: 0 }
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
      const dist = metricFromInput(this.data.distStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        runTime: null,
        runDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const t = metricFromInput(this.data.timeStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        runTime: t,
        runDistance: null,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = sanitizeIntString(e.detail.value);
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        runTime: null,
        runDistance: metricFromInput(distStr),
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = sanitizeIntString(e.detail.value);
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        runTime: metricFromInput(timeStr),
        runDistance: null,
        actInputMode: "time"
      });
    }
  }
});
