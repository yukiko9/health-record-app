const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function clampScore(n) {
  const x = parseInt(String(n), 10);
  if (Number.isNaN(x)) return 60;
  return Math.max(0, Math.min(100, x));
}

function toDigitArray(n) {
  return String(clampScore(n)).split("").map((c) => parseInt(c, 10));
}

function buildColumns(digits, offsets, anim, keyBase) {
  return digits.map((d, i) => ({
    k: `${keyBase}-${i}`,
    stack: DIGITS,
    offsetEm: -offsets[i],
    anim: !!anim
  }));
}

Component({
  externalClasses: ["score-class"],
  properties: {
    value: {
      type: String,
      value: "60"
    },
    /** enter-ui 等：白色数字，避免页面样式无法穿透组件 */
    light: {
      type: Boolean,
      value: false
    }
  },
  data: {
    columns: []
  },
  lifetimes: {
    attached() {
      this._prevDigits = null;
    }
  },
  observers: {
    value(v) {
      const next = toDigitArray(v);
      if (!this._prevDigits) {
        this._prevDigits = next;
        this.setData({
          columns: buildColumns(next, next, false, "i0")
        });
        return;
      }
      const prev = this._prevDigits;
      if (next.join(",") === prev.join(",")) {
        return;
      }

      if (prev.length !== next.length) {
        this._prevDigits = next;
        this.setData({
          columns: buildColumns(next, next, false, "len")
        });
        return;
      }

      const phase0 = buildColumns(next, prev, false, "p0");
      this.setData({ columns: phase0 }, () => {
        setTimeout(() => {
          const phase1 = buildColumns(next, next, true, "p1");
          this.setData({ columns: phase1 });
        }, 40);
      });
      this._prevDigits = next;
    }
  }
});
