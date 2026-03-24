Component({
  properties: {
    value: {
      type: Object,
      value: { slowWalkTime: 10, slowWalkDistance: 1000 }
    },
    inputMode: {
      type: String,
      value: "time"
    }
  },

  data: {
    timeStr: "10",
    distStr: "1000"
  },

  observers: {
    value(v) {
      if (!v) return;
      this.setData({
        timeStr: v.slowWalkTime != null && v.slowWalkTime !== "" ? String(v.slowWalkTime) : "0",
        distStr: v.slowWalkDistance != null && v.slowWalkDistance !== "" ? String(v.slowWalkDistance) : "0"
      });
    }
  },

  methods: {
    stopBubble() {},

    onPickDistance() {
      const dist = Number(this.data.distStr) || 0;
      this.triggerEvent("change", {
        slowWalkTime: 0,
        slowWalkDistance: dist,
        actInputMode: "distance"
      });
    },

    onPickTime() {
      const t = Number(this.data.timeStr) || 0;
      this.triggerEvent("change", {
        slowWalkTime: t,
        slowWalkDistance: 0,
        actInputMode: "time"
      });
    },

    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr });
      this.triggerEvent("change", {
        slowWalkTime: 0,
        slowWalkDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },

    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr });
      this.triggerEvent("change", {
        slowWalkTime: Number(timeStr) || 0,
        slowWalkDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
