const { metricFromInput, sanitizeIntString } = require("../../utils/actInput");

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
      const dist = metricFromInput(this.data.distStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: null,
        fastWalkDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const t = metricFromInput(this.data.timeStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: t,
        fastWalkDistance: null,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = sanitizeIntString(e.detail.value);
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: null,
        fastWalkDistance: metricFromInput(distStr),
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = sanitizeIntString(e.detail.value);
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        fastWalkTime: metricFromInput(timeStr),
        fastWalkDistance: null,
        actInputMode: "time"
      });
    }
  }
});
