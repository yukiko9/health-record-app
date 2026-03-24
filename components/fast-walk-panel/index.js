Component({
  properties: {
    value: {
      type: Object,
      value: { fastWalkTime: 10, fastWalkDistance: 1000 }
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
        timeStr: v.fastWalkTime != null && v.fastWalkTime !== "" ? String(v.fastWalkTime) : "0",
        distStr: v.fastWalkDistance != null && v.fastWalkDistance !== "" ? String(v.fastWalkDistance) : "0"
      });
    }
  },

  methods: {
    stopBubble() {},
    onPickDistance() {
      const dist = Number(this.data.distStr) || 0;
      this.triggerEvent("change", {
        fastWalkTime: 0,
        fastWalkDistance: dist,
        actInputMode: "distance"
      });
    },
    onPickTime() {
      const t = Number(this.data.timeStr) || 0;
      this.triggerEvent("change", {
        fastWalkTime: t,
        fastWalkDistance: 0,
        actInputMode: "time"
      });
    },
    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr });
      this.triggerEvent("change", {
        fastWalkTime: 0,
        fastWalkDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr });
      this.triggerEvent("change", {
        fastWalkTime: Number(timeStr) || 0,
        fastWalkDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
