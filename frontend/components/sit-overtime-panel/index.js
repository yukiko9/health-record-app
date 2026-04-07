Component({
  properties: {
    value: {
      type: Object,
      value: { sitOvertimeTime: 0 }
    }
  },

  data: {
    timeStr: "0"
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
