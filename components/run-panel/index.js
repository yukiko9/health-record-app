Component({
  properties: {
    value: {
      type: Object,
      value: { runTime: 10, runDistance: 1000 }
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
        timeStr: v.runTime != null && v.runTime !== "" ? String(v.runTime) : "0",
        distStr: v.runDistance != null && v.runDistance !== "" ? String(v.runDistance) : "0"
      });
    }
  },

  methods: {
    stopBubble() {},
    onPickDistance() {
      const dist = Number(this.data.distStr) || 0;
      this.triggerEvent("change", {
        runTime: 0,
        runDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const t = Number(this.data.timeStr) || 0;
      this.triggerEvent("change", {
        runTime: t,
        runDistance: 0,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr });
      this.triggerEvent("change", {
        runTime: 0,
        runDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr });
      this.triggerEvent("change", {
        runTime: Number(timeStr) || 0,
        runDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
