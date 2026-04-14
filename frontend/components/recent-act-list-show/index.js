Component({
  properties: {
    list: {
      type: Array,
      value: []
    }
  },

  methods: {
    deleteRecord(e) {
      const idx = Number(e.currentTarget.dataset.index);
      const item = (this.data.list || [])[idx];
      if (!item) return;
      this.triggerEvent("deleterecord", { item, index: idx });
    }
  }
});
