Component({
  properties: {
    selectedMap: {
      type: Object,
      value: {}
    },
    fullness: {
      type: Number,
      value: 3
    }
  },
  methods: {
    toggleItem(e) {
      const key = e.currentTarget.dataset.key;
      this.triggerEvent("toggle", { key });
    },
    fullnessAdd() {
      this.triggerEvent("fullnesschange", { delta: 1 });
    },
    fullnessReduce() {
      this.triggerEvent("fullnesschange", { delta: -1 });
    }
  }
});
