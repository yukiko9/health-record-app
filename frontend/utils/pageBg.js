/**
 * 按 health 分数（0–100）生成与 background-color.png 一致的竖直渐变背景 style 字符串。
 */
/** 与 background-color.png 五档对齐（含 score=60 浅青柠顶 / 黄绿底） */
const STOPS = [
  { s: 0, top: "#fff44f", bottom: "#e85d04" },
  { s: 40, top: "#fff44f", bottom: "#e6b800" },
  { s: 60, top: "#e8f5c8", bottom: "#c4dd4a" },
  { s: 80, top: "#e8f5c8", bottom: "#7fd843" },
  { s: 100, top: "#e8f5c8", bottom: "#4caf50" }
];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const x = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${x(r)}${x(g)}${x(b)}`;
}

function lerpColor(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

function interpolateStops(score) {
  let i = 0;
  for (let k = 0; k < STOPS.length - 1; k++) {
    if (score <= STOPS[k + 1].s) {
      i = k;
      break;
    }
    i = STOPS.length - 2;
  }
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const span = b.s - a.s || 1;
  const t = (score - a.s) / span;
  return {
    top: lerpColor(a.top, b.top, t),
    bottom: lerpColor(a.bottom, b.bottom, t)
  };
}

function getScorePageBackgroundStyle(scoreValue) {
  const s =
    typeof scoreValue === "number" && !Number.isNaN(scoreValue)
      ? Math.max(0, Math.min(100, scoreValue))
      : 60;
  const { top, bottom } = interpolateStops(s);
  return `background: linear-gradient(180deg, ${top} 0%, ${bottom} 100%); transition: background 0.65s cubic-bezier(0.4, 0, 0.2, 1);`;
}

module.exports = {
  getScorePageBackgroundStyle
};
