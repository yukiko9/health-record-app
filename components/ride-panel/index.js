Component({
  properties: {
    value: {
      type: Object,
      value: { rideTime: 10, rideDistance: 0 }
    },
    inputMode: {
      type: String,
      value: "time"
    }
  },

  data: {
    timeStr: "10",
    distStr: "0"
  },

  observers: {
    value(v) {
      if (!v) return;
      this.setData({
        timeStr: v.rideTime != null && v.rideTime !== "" ? String(v.rideTime) : "0",
        distStr: v.rideDistance != null && v.rideDistance !== "" ? String(v.rideDistance) : "0"
      });
    }
  },

  methods: {
    stopBubble() {},

    onPickDistance() {
      const dist = Number(this.data.distStr) || 0;
      this.triggerEvent("change", {
        rideTime: 0,
        rideDistance: dist,
        actInputMode: "distance"
      });
    },

    onPickTime() {
      const t = Number(this.data.timeStr) || 0;
      this.triggerEvent("change", {
        rideTime: t,
        rideDistance: 0,
        actInputMode: "time"
      });
    },

    onDistanceInput(e) {
      const distStr = e.detail.value;
      this.setData({ distStr });
      this.triggerEvent("change", {
        rideTime: 0,
        rideDistance: Number(distStr) || 0,
        actInputMode: "distance"
      });
    },

    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr });
      this.triggerEvent("change", {
        rideTime: Number(timeStr) || 0,
        rideDistance: 0,
        actInputMode: "time"
      });
    }
  }
});
