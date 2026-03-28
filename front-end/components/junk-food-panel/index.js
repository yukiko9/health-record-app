Component({
  properties: {
    selectedMap: {
      type: Object,
      value: {}
    },
    fullness: {
      type: Number,
      value: 3
    },
    milkteaSugar: {
      type: String,
      value: "full"
    }
  },

  data: {
    sugarOptions: [
      { value: "full", label: "全糖" },
      { value: "half", label: "半糖" },
      { value: "light", label: "微糖" },
      { value: "none", label: "无糖" }
    ]
  },

  methods: {
    toggleItem(e) {
      const key = e.currentTarget.dataset.key;
      this.triggerEvent("toggle", { key });
    },
    onSugarTap(e) {
      const v = e.currentTarget.dataset.value;
      this.triggerEvent("milkteasugarchange", { milkteaSugar: v });
    },
    fullnessAdd() {
      this.triggerEvent("fullnesschange", { delta: 1 });
    },
    fullnessReduce() {
      this.triggerEvent("fullnesschange", { delta: -1 });
    }
  }
});
