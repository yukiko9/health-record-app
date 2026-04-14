const { metricFromInput, sanitizeIntString } = require("../../utils/actInput");

Component({
  properties: {
    value: {
      type: Object,
      value: { slowWalkTime: 0, slowWalkDistance: 0 }
    },
    inputMode: {
      type: String,
      value: "time"
    },
    resetStamp: {
      type: Number,
      value: 0
    }
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
          v.slowWalkTime != null && v.slowWalkTime !== "" ? String(v.slowWalkTime) : "",
        distStr:
          v.slowWalkDistance != null && v.slowWalkDistance !== ""
            ? String(v.slowWalkDistance)
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
        slowWalkTime: null,
        slowWalkDistance: dist,
        actInputMode: "distance"
      });
    },

    onPickTime() {
      const t = metricFromInput(this.data.timeStr);
      this.setData({ metricTouched: true });
      this.triggerEvent("change", {
        slowWalkTime: t,
        slowWalkDistance: null,
        actInputMode: "time"
      });
    },

    onDistanceInput(e) {
      const distStr = sanitizeIntString(e.detail.value);
      this.setData({ distStr, metricTouched: true });
      this.triggerEvent("change", {
        slowWalkTime: null,
        slowWalkDistance: metricFromInput(distStr),
        actInputMode: "distance"
      });
    },

    onTimeInput(e) {
      const timeStr = sanitizeIntString(e.detail.value);
      this.setData({ timeStr, metricTouched: true });
      this.triggerEvent("change", {
        slowWalkTime: metricFromInput(timeStr),
        slowWalkDistance: null,
        actInputMode: "time"
      });
    }
  }
});
