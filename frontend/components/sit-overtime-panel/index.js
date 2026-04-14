const { metricFromInput, sanitizeIntString } = require("../../utils/actInput");

Component({
  properties: {
    value: {
      type: Object,
      value: { sitOvertimeTime: 0 }
    }
  },

  data: {
    timeStr: ""
  },

  observers: {
    value(v) {
      if (!v) return;
      this.setData({
        timeStr:
          v.sitOvertimeTime != null && v.sitOvertimeTime !== ""
            ? String(v.sitOvertimeTime)
            : ""
      });
    }
  },

  methods: {
    stopBubble() {},
    onTimeInput(e) {
      const timeStr = sanitizeIntString(e.detail.value);
      this.setData({ timeStr });
      this.triggerEvent("change", {
        sitOvertimeTime: metricFromInput(timeStr)
      });
    }
  }
});
