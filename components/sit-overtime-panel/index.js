Component({
  properties: {
    value: {
      type: Object,
      value: { sitOvertimeTime: 30 }
    }
  },

  data: {
    timeStr: "30"
  },

  observers: {
    value(v) {
      if (!v) return;
      this.setData({
        timeStr: v.sitOvertimeTime != null && v.sitOvertimeTime !== "" ? String(v.sitOvertimeTime) : "0"
      });
    }
  },

  methods: {
    stopBubble() {},
    onTimeInput(e) {
      const timeStr = e.detail.value;
      this.setData({ timeStr });
      this.triggerEvent("change", {
        sitOvertimeTime: Number(timeStr) || 0
      });
    }
  }
});
