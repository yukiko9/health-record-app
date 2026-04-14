const { metricFromInput, sanitizeIntString } = require("../../utils/actInput");

Component({
  properties: {
    value: {
      type: Object,
      value: { jogTime: 0, jogDistance: 0 }
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
      const dist = metricFromInput(this.data.distStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        jogTime: null,
        jogDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const t = metricFromInput(this.data.timeStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        jogTime: t,
        jogDistance: null,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = sanitizeIntString(e.detail.value);
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        jogTime: null,
        jogDistance: metricFromInput(distStr),
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = sanitizeIntString(e.detail.value);
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        jogTime: metricFromInput(timeStr),
        jogDistance: null,
        actInputMode: "time"
      });
    }
  }
});
